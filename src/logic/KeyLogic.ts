import { produce } from 'immer';
import { InventoryItem, itemMaxes } from './Inventory';
import { RegularDungeon, isRegularDungeon } from './Locations';
import { Logic, LogicalCheck } from './Logic';
import { computeLeastFixedPoint } from './bitlogic/BitLogic';
import { BitVector } from './bitlogic/BitVector';
import { LogicalExpression } from './bitlogic/LogicalExpression';
import { mapInventory } from '../tracker/selectors';
import _ from 'lodash';

interface DungeonData {
    dungeon: RegularDungeon;
    checks: string[];
    smallKey: InventoryItem | undefined;
    numSmallKeys: number;
    bossKey: InventoryItem;
    bossKeyChecks: string[];
    smallKeyChecksByNumSmallKeys: string[][];
}

/**
 * Figures out how many keys you need for each check in a dungeon.
 * This is a bit complex unfortunately :(
 */
export function keyData(
    logic: Logic,
    settingsRequirements: Record<string, LogicalExpression>,
    checkRequirements: Record<string, LogicalExpression>,
    isCheckBanned: (checkId: string, check: LogicalCheck) => boolean,
    optimisticLogicBits: BitVector,
) {
    const data: DungeonData[] = _.compact(
        logic.hintRegions.filter(isRegularDungeon).map((dungeon) => {
            const checks = logic.checksByHintRegion[dungeon];
            // For every dungeon, check if "optimistically" (with all items, keys, ...) all non-banned checks are in logic.
            // If not, we may be missing some entrances and we can't actually do key logic in this dungeon.
            if (
                !checks.every(
                    (check) =>
                        isCheckBanned(check, logic.checks[check]) ||
                        optimisticLogicBits.test(logic.itemBits[check])
                )
            ) {
                return undefined;
            }

            const smallKey =
                dungeon !== 'Earth Temple'
                    ? (`${dungeon} Small Key` as const)
                    : undefined;
            const numSmallKeys = smallKey ? itemMaxes[smallKey] : 0;
            const keyIndex = Array(numSmallKeys + 1)
                .fill(null)
                .map(() => []);
            return {
                dungeon,
                checks: checks.filter(
                    (check) => !isCheckBanned(check, logic.checks[check]),
                ),
                smallKey,
                numSmallKeys,
                bossKey: `${dungeon} Boss Key`,
                bossKeyChecks: [],
                smallKeyChecksByNumSmallKeys: keyIndex,
            };
        }),
    );

    // Now compute our baseline logic state - we have all items, except for small keys and boss keys.
    const fullInventoryNoKeys = produce(
        itemMaxes,
        (draft: Record<string, number>) => {
            delete draft.Sailcloth;
            const allKeyItems = data.flatMap((d) => [d.smallKey, d.bossKey]);
            for (const item of allKeyItems) {
                if (item) {
                    delete draft[item];
                }
            }
        },
    );

    // This baseline logic state can be re-used in later computations
    const baselineLogicState = computeLeastFixedPoint(logic.bitLogic, [
        settingsRequirements,
        checkRequirements,
        mapInventory(logic, fullInventoryNoKeys),
    ]);

    // TODO: These steps could be transposed to run more in parallel.
    for (const dungeon of data) {
        // Now take the boss keys away.
        const fullInventoryNoBossKeys = produce(
            itemMaxes,
            (draft: Record<string, number>) => {
                delete draft.Sailcloth;
                for (const dungeon of data) {
                    delete draft[dungeon.bossKey];
                }
            },
        );

        const logicStateNoBossKeys = computeLeastFixedPoint(
            logic.bitLogic,
            [
                settingsRequirements,
                checkRequirements,
                mapInventory(logic, fullInventoryNoBossKeys),
            ],
            baselineLogicState,
        );

        for (const check of dungeon.checks) {
            const bit = logic.itemBits[check];
            if (
                !logicStateNoBossKeys.test(bit) &&
                optimisticLogicBits.test(bit)
            ) {
                dungeon.bossKeyChecks.push(check);
            }
        }

        // Then repeatedly take small keys and see which checks are out of logic.

        let previousLogicState = logicStateNoBossKeys;
        let i = dungeon.numSmallKeys;
        for (; i >= 1; i--) {
            const inventoryWithNumKeys = produce(
                itemMaxes,
                // eslint-disable-next-line no-loop-func
                (draft: Record<string, number>) => {
                    delete draft.Sailcloth;
                    delete draft[dungeon.bossKey];
                    if (dungeon.smallKey) {
                        draft[dungeon.smallKey] = i - 1;
                    }
                },
            );
            const logicStateWithNumKeys = computeLeastFixedPoint(
                logic.bitLogic,
                [
                    settingsRequirements,
                    checkRequirements,
                    mapInventory(logic, inventoryWithNumKeys),
                ],
                baselineLogicState,
            );

            for (const check of dungeon.checks) {
                const bit = logic.itemBits[check];
                if (
                    !logicStateWithNumKeys.test(bit) &&
                    previousLogicState.test(bit)
                ) {
                    dungeon.smallKeyChecksByNumSmallKeys[i].push(check);
                }
            }
            previousLogicState = logicStateWithNumKeys;
        }
        for (const check of dungeon.checks) {
            const bit = logic.itemBits[check];
            if (previousLogicState.test(bit)) {
                dungeon.smallKeyChecksByNumSmallKeys[i].push(check);
            }
        }
        console.log(dungeon);
    }

    return data;
}

/** Predict which keys must be accessible in the dungeon, given logical and tracker state. */
export function getSemiLogicKeys(
    logic: Logic,
    bossKeysInDungeon: boolean,
    smallKeysInDungeon: boolean,
    inventory: Record<InventoryItem, number>,
    dungeon: DungeonData,
    inLogicBits: BitVector,
    checkedChecks: string[],
) {
    if (
        !inventory[dungeon.bossKey] &&
        bossKeysInDungeon &&
        dungeon.checks.every(
            (check) =>
                dungeon.bossKeyChecks.includes(check) ||
                inLogicBits.test(logic.itemBits[check]) ||
                checkedChecks.includes(check),
        )
    ) {
        inventory[dungeon.bossKey] = 1;
        return true;
    } else if (smallKeysInDungeon && dungeon.smallKey) {
        const smallKeyItem = dungeon.smallKey;
        const numKeys = inventory[smallKeyItem];
        const checksWeHaveKeysFor: string[] = [];
        const nextNumKeys = dungeon.smallKeyChecksByNumSmallKeys.findIndex(
            (_checks, idx) => idx > numKeys,
        );
        if (nextNumKeys === -1) {
            return false;
        }
        for (let i = 0; i <= numKeys; i++) {
            checksWeHaveKeysFor.push(
                ...dungeon.smallKeyChecksByNumSmallKeys[i],
            );
        }
        if (
            checksWeHaveKeysFor.every(
                (check) =>
                    checkedChecks.includes(check) ||
                    inLogicBits.test(logic.itemBits[check]),
            )
        ) {
            inventory[smallKeyItem] = nextNumKeys;
            return true;
        }
    }

    return false;
}
