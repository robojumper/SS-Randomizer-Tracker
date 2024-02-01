import { produce } from 'immer';
import { InventoryItem, itemMaxes } from './Inventory';
import { dungeonNames, isRegularDungeon } from './Locations';
import { Logic, LogicalCheck, isRegularItemCheck } from './Logic';
import { computeLeastFixedPoint } from './bitlogic/BitLogic';
import { BitVector } from './bitlogic/BitVector';
import { LogicalExpression } from './bitlogic/LogicalExpression';
import { mapInventory } from '../tracker/selectors';
import _ from 'lodash';
import { TypedOptions } from '../permalink/SettingsTypes';

interface PotentialLocations {
    item: InventoryItem;
    count: number;
    potentialChecks: string[];
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
    const locations: PotentialLocations[] = [];

    const regionChecks = (region: string) =>
        logic.checksByHintRegion[region].filter(
            (c) =>
                isRegularItemCheck(logic.checks[c].type) &&
                !isCheckBanned(c, logic.checks[c]),
        );

    // Caves small key
    if (
        smallKeySetting === 'Own Dungeon - Restricted' ||
        smallKeySetting === 'Vanilla'
    ) {
        const cavesChecks = regionChecks('Lanayru Caves');
        const item: InventoryItem = 'Lanayru Caves Small Key';
        locations.push({
            item,
            count: 1,
            potentialChecks:
                smallKeySetting === 'Vanilla'
                    ? cavesChecks.filter(
                        (c) => logic.checks[c].originalItem === item,
                    )
                    : cavesChecks,
        });
    }

    // Now compute our baseline logic state - we have all items, except for small keys and boss keys.
    const fullInventoryNoKeys = produce(
        itemMaxes,
        (draft: Record<string, number>) => {
            for (const dungeon of dungeonNames.filter(isRegularDungeon)) {
                delete draft[`${dungeon} Boss Key` satisfies InventoryItem];
                if (dungeon !== 'Earth Temple') {
                    delete draft[
                        `${dungeon} Small Key` satisfies InventoryItem
                    ];
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

    for (const dungeon of dungeonNames.filter(isRegularDungeon)) {
        const dungeonChecks = regionChecks(dungeon);

        const bossKey = `${dungeon} Boss Key` as const;
        const smallKey =
            dungeon !== 'Earth Temple'
                ? (`${dungeon} Small Key` as const)
                : undefined;

        const checksThatCanContainBossKey =
            bossKeySetting === 'Vanilla'
                ? dungeonChecks.filter(
                    (check) => logic.checks[check].originalItem === bossKey,
                )
                : bossKeySetting === 'Own Dungeon'
                    ? dungeonChecks
                    : undefined;

        const checksThatCanContainSmallKey = smallKey
            ? smallKeySetting === 'Vanilla'
                ? dungeonChecks.filter(
                    (check) => logic.checks[check].originalItem === smallKey,
                )
                : smallKeySetting === 'Own Dungeon - Restricted' ||
                  smallKeySetting === 'Lanayru Caves Key Only'
                    ? dungeonChecks
                    : undefined
            : undefined;

        // For every kind of check, check if "optimistically" (with all items, keys, ...) all relevant checks are in logic.
        // If not, we may be missing some entrances and we can't actually do key logic in this dungeon.
        const allChecksPotentiallyReachable = (
            checks: string[] | undefined,
        ): true | undefined =>
            checks?.every((check) =>
                optimisticLogicBits.test(logic.itemBits[check]),
            ) || undefined;

        const canDoBossKeyLogic = allChecksPotentiallyReachable(
            checksThatCanContainBossKey,
        );
        const canDoSmallKeyLogic = allChecksPotentiallyReachable(
            checksThatCanContainSmallKey,
        );

        const inventory = _.clone(fullInventoryNoKeys);
        let logicState = baselineLogicState;
        if (smallKey && checksThatCanContainSmallKey && canDoSmallKeyLogic) {
            for (let i = 1; i <= itemMaxes[smallKey]; i++) {
                locations.push({
                    item: smallKey,
                    count: i,
                    // eslint-disable-next-line no-loop-func
                    potentialChecks: checksThatCanContainSmallKey.filter((c) =>
                        logicState.test(logic.itemBits[c]),
                    ),
                });
                inventory[smallKey] = i;
                logicState = computeLeastFixedPoint(logic.bitLogic, [
                    settingsRequirements,
                    checkRequirements,
                    mapInventory(logic, inventory),
                ], logicState);
            }
        }

        // NB this uses the results from small key logic
        if (checksThatCanContainBossKey && canDoBossKeyLogic) {
            locations.push({
                item: bossKey,
                count: 1,
                potentialChecks: checksThatCanContainBossKey.filter((c) =>
                    logicState.test(logic.itemBits[c]),
                ),
            });
        }
    }

    return locations;
}

/** Predict which keys must be accessible in the dungeon, given logical and tracker state. */
export function getSemiLogicKeys(
    logic: Logic,
    inventory: Record<InventoryItem, number>,
    data: PotentialLocations[],
    inLogicBits: BitVector,
    checkedChecks: string[],
): boolean {
    let changed = false;
    for (const entry of data) {
        if (
            inventory[entry.item] < entry.count &&
            entry.potentialChecks.length &&
            entry.potentialChecks.every(
                (c) =>
                    inLogicBits.test(logic.itemBits[c]) ||
                    checkedChecks.includes(c),
            )
        ) {
            inventory[entry.item] = entry.count;
            changed = true;
        }
    }
    return changed;
}
