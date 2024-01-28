import { produce } from 'immer';
import { InventoryItem, itemMaxes } from './Inventory';
import { RegularDungeon, isRegularDungeon } from './Locations';
import { Logic, LogicalCheck } from './Logic';
import { computeLeastFixedPoint } from './bitlogic/BitLogic';
import { BitVector } from './bitlogic/BitVector';
import { LogicalExpression } from './bitlogic/LogicalExpression';
import { mapInventory } from '../tracker/selectors';
import _ from 'lodash';
import { TypedOptions } from '../permalink/SettingsTypes';

// TODO: Semilogic for Lanayru Small Caves key

interface DungeonData {
    dungeon: RegularDungeon;
    smallKey: InventoryItem | undefined;
    numSmallKeys: number;
    bossKey: InventoryItem;
    potentialBossKeyChecks: string[] | undefined;
    potentialSmallKeyChecks: string[] | undefined;
    potentialSmallKeyChecksByRequiredSmallKeys: string[][] | undefined;
}

/**
 * Figures out how many keys you need for each check in a dungeon.
 * This is a bit complex unfortunately :(
 */
export function keyData(
    logic: Logic,
    bossKeySetting: TypedOptions['boss-key-mode'],
    smallKeySetting: TypedOptions['small-key-mode'],
    settingsRequirements: Record<string, LogicalExpression>,
    checkRequirements: Record<string, LogicalExpression>,
    isCheckBanned: (checkId: string, check: LogicalCheck) => boolean,
    optimisticLogicBits: BitVector,
) {
    const data: DungeonData[] = _.compact(
        logic.hintRegions.filter(isRegularDungeon).map((dungeon) => {
            const checks = logic.checksByHintRegion[dungeon];
            const nonBannedChecks = checks.filter(
                (check) => !isCheckBanned(check, logic.checks[check]),
            );

            const bossKey = `${dungeon} Boss Key` as const;
            const smallKey =
                dungeon !== 'Earth Temple'
                    ? (`${dungeon} Small Key` as const)
                    : undefined;

            const checksThatCanContainBossKey =
                bossKeySetting === 'Vanilla'
                    ? checks.filter(
                        (check) =>
                            logic.checks[check].originalItem === bossKey,
                    )
                    : bossKeySetting === 'Own Dungeon'
                        ? nonBannedChecks
                        : undefined;

            const checksThatCanContainSmallKey = smallKey
                ? smallKeySetting === 'Vanilla'
                    ? checks.filter(
                        (check) =>
                            logic.checks[check].originalItem === smallKey,
                    )
                    : smallKeySetting === 'Own Dungeon - Restricted' ||
                      smallKeySetting === 'Lanayru Caves Key Only'
                        ? nonBannedChecks
                        : undefined
                : undefined;

            // For every kind of check, check if "optimistically" (with all items, keys, ...) all relevant checks are in logic.
            // If not, we may be missing some entrances and we can't actually do key logic in this dungeon.
            const allChecksPotentiallyReachable = (checks: string[] | undefined): true | undefined => checks?.every(
                (check) =>
                    optimisticLogicBits.test(logic.itemBits[check]),
            ) || undefined;

            const canDoBossKeyLogic = allChecksPotentiallyReachable(checksThatCanContainBossKey);
            const canDoSmallKeyLogic = allChecksPotentiallyReachable(checksThatCanContainSmallKey);

            const numSmallKeys = smallKey ? itemMaxes[smallKey] : 0;
            const keyIndex = Array(numSmallKeys + 1)
                .fill(null)
                .map(() => []);
            return {
                dungeon,
                smallKey,
                numSmallKeys,
                bossKey,
                potentialBossKeyChecks: canDoBossKeyLogic && checksThatCanContainBossKey,
                potentialSmallKeyChecks: canDoSmallKeyLogic && checksThatCanContainSmallKey,
                potentialSmallKeyChecksByRequiredSmallKeys: canDoSmallKeyLogic && keyIndex,
            } satisfies DungeonData;
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

        if (
            dungeon.potentialSmallKeyChecks &&
            dungeon.potentialSmallKeyChecksByRequiredSmallKeys
        ) {
            const logicStateNoBossKeys = computeLeastFixedPoint(
                logic.bitLogic,
                [
                    settingsRequirements,
                    checkRequirements,
                    mapInventory(logic, fullInventoryNoBossKeys),
                ],
                baselineLogicState,
            );

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

                for (const check of dungeon.potentialSmallKeyChecks) {
                    const bit = logic.itemBits[check];
                    if (
                        !logicStateWithNumKeys.test(bit) &&
                        previousLogicState.test(bit)
                    ) {
                        dungeon.potentialSmallKeyChecksByRequiredSmallKeys[
                            i
                        ].push(check);
                    }
                }
                previousLogicState = logicStateWithNumKeys;
            }
            for (const check of dungeon.potentialSmallKeyChecks) {
                const bit = logic.itemBits[check];
                if (previousLogicState.test(bit)) {
                    dungeon.potentialSmallKeyChecksByRequiredSmallKeys[
                        i
                    ].push(check);
                }
            }
            console.log(dungeon);
        }
    }

    return data;
}

/** Predict which keys must be accessible in the dungeon, given logical and tracker state. */
export function getSemiLogicKeys(
    logic: Logic,
    inventory: Record<InventoryItem, number>,
    dungeon: DungeonData,
    inLogicBits: BitVector,
    checkedChecks: string[],
) {
    if (
        !inventory[dungeon.bossKey] &&
        dungeon.potentialBossKeyChecks?.every(
            (check) =>
                inLogicBits.test(logic.itemBits[check]) ||
                checkedChecks.includes(check),
        )
    ) {
        inventory[dungeon.bossKey] = 1;
        return true;
    } else if (
        dungeon.potentialSmallKeyChecksByRequiredSmallKeys &&
        dungeon.smallKey
    ) {
        const smallKeyItem = dungeon.smallKey;
        const numKeys = inventory[smallKeyItem];
        const smallKeyChecksWeHaveKeysFor: string[] = [];
        const nextNumKeys =
            dungeon.potentialSmallKeyChecksByRequiredSmallKeys.findIndex(
                (_checks, idx) => idx > numKeys,
            );
        if (nextNumKeys === -1) {
            return false;
        }
        for (let i = 0; i <= numKeys; i++) {
            smallKeyChecksWeHaveKeysFor.push(
                ...dungeon.potentialSmallKeyChecksByRequiredSmallKeys[i],
            );
        }
        if (
            smallKeyChecksWeHaveKeysFor.every(
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
