import { createSelector, lruMemoize } from '@reduxjs/toolkit';
import { compact, groupBy, isEqual, keyBy, partition, sumBy } from 'es-toolkit';
import {
    counterBasisSelector,
    trickSemiLogicSelector,
} from '../customization/Selectors';
import { parseHintsText } from '../hints/HintsParser';
import {
    getAllowedStartingEntrances,
    getEntrancePools,
    getExitRules,
    getExits,
    getUsedEntrances,
} from '../logic/Entrances';
import { type InventoryItem, itemMaxes } from '../logic/Inventory';
import { keyData } from '../logic/KeyLogic';
import {
    type Check,
    type CheckGroup,
    type DungeonName,
    type HintRegion,
    isDungeon,
    type LogicalState,
} from '../logic/Locations';
import { TimeOfDay } from '../logic/Mappers';
import { getAdditionalItems } from '../logic/Misc';
import { computeSemiLogic } from '../logic/SemiLogic';
import { doesHintDistroUseGossipStone } from '../logic/ThingsThatWouldBeNiceToHaveInTheDump';
import {
    cubeCheckToGoddessChestCheck,
    dungeonCompletionItems,
    goddessChestCheckToCubeCheck,
} from '../logic/TrackerModifications';
import type { Location2 } from '../logic/logic2/Location';
import {
    evaluateRequirement,
    getInitialSearchState,
    search,
    type SearchState2,
} from '../logic/logic2/Search';
import type { RootState } from '../store/Store';
import type { TooltipRequirement2 } from '../tooltips/worker/BitIndex';
import { emptyArray, mapValues } from '../utils/Collections';
import { stubTrue } from '../utils/Function';
import { currySelector } from '../utils/Redux';
import {
    logicSelector,
    requiredDungeonsSelector,
} from './LogicInstanceSelector';
import { settingSelector, settingsSelector } from './SettingsSelector';

const parsedHintsSelector = createSelector(
    [(state: RootState) => state.tracker.userHintsText, logicSelector],
    (hintsText, logic) =>
        parseHintsText(hintsText, logic.hintRegions.hintRegions),
    {
        // Make sure we don't accumulate garbage for every single
        // value of the hints text input
        memoize: lruMemoize,
        memoizeOptions: {
            // Skip rerenders if the parsed hints are deeply equal
            resultEqualityCheck: isEqual,
        },
    },
);

/**
 * A map from hint region to all tracked and parsed region hints.
 */
const allAreaHintsSelector = createSelector(
    [
        logicSelector,
        parsedHintsSelector,
        (state: RootState) => state.tracker.hints,
    ],
    (logic, parsed, tracked) =>
        Object.fromEntries(
            logic.hintRegions.hintRegions.map((region) => [
                region,
                [...(tracked[region] ?? []), ...(parsed[region] ?? [])],
            ]),
        ),
);

/**
 * Selects the hint for a given area.
 */
export const areaHintSelector = currySelector(
    createSelector(
        [(_state: RootState, area: string) => area, allAreaHintsSelector],
        (area, hints) => hints[area] ?? emptyArray(),
    ),
);

/**
 * All hinted items.
 */
export const checkHintsSelector = (state: RootState) =>
    state.tracker.checkHints;

/**
 * Selects the hinted item for a given check
 */
export const checkHintSelector = currySelector(
    (state: RootState, checkId: string) => state.tracker.checkHints[checkId],
);

const rawItemCountsSelector = (state: RootState) => state.tracker.inventory;

/** A map of all actual items to their counts. Since redux only stores partial counts, this ensures all items are present. */
const inventorySelector = createSelector(
    [rawItemCountsSelector],
    (rawInventory) =>
        mapValues(itemMaxes, (_val, item) => rawInventory[item] ?? 0),
    { memoizeOptions: { resultEqualityCheck: isEqual } },
);

export const rawItemCountSelector = currySelector(
    (state: RootState, item: InventoryItem) =>
        inventorySelector(state)[item] ?? 0,
);

const checkedChecksSelector = createSelector(
    [(state: RootState) => state.tracker.checkedChecks],
    (checkedChecks) => new Set(checkedChecks),
);

const checkItemsSelector = createSelector(
    [logicSelector, inventorySelector, checkedChecksSelector],
    getAdditionalItems,
    { memoizeOptions: { resultEqualityCheck: isEqual } },
);

export const totalGratitudeCrystalsSelector = createSelector(
    [checkItemsSelector, rawItemCountSelector('Gratitude Crystal Pack')],
    (checkItems, packCount) => {
        return packCount * 5 + (checkItems['Gratitude Crystal'] ?? 0);
    },
);

const allowedStartingEntrancesSelector = createSelector(
    [logicSelector, settingSelector('random-start-entrance')],
    getAllowedStartingEntrances,
);

/**
 * Describes which entrances are available for a given pool (dungeons, silent realms, starting, ...)
 * This is a bit overkill because it keeps all pools available at all times, but it
 * used to be necessary when we allowed context menus to select entrances, since
 * context menus had to be always rendered and there wasn't a way to include
 */
export const entrancePoolsSelector = createSelector(
    [
        logicSelector,
        allowedStartingEntrancesSelector,
        settingSelector('randomize-entrances'),
        settingSelector('randomize-dungeon-entrances'),
        requiredDungeonsSelector,
    ],
    getEntrancePools,
);

const mappedExitsSelector = (state: RootState) => state.tracker.mappedExits;

/** Defines how exits should be resolved. */
const exitRulesSelector = createSelector(
    [
        logicSelector,
        settingSelector('random-start-entrance'),
        settingSelector('randomize-entrances'),
        settingSelector('randomize-dungeon-entrances'),
        settingSelector('randomize-trials'),
        settingSelector('random-start-statues'),
        settingSelector('empty-unrequired-dungeons'),
        requiredDungeonsSelector,
    ],
    getExitRules,
);

export const exitsSelector = createSelector(
    [logicSelector, exitRulesSelector, mappedExitsSelector],
    getExits,
);

export const exitsByIdSelector = createSelector([exitsSelector], (exits) =>
    keyBy(exits, (e) => e.exit.id),
);

export const inLogicSearchSelector = createSelector(
    [logicSelector, exitsSelector, inventorySelector, checkItemsSelector],
    (logic, exits, inventory, auxItems) => {
        const initialState = getInitialSearchState(inventory, auxItems);
        return search(logic, exits, initialState);
    },
);

export const optimisticSearchSelector = createSelector(
    [logicSelector, exitsSelector, inLogicSearchSelector],
    (logic, exits, inLogicState) => {
        const state: SearchState2 = {
            ...inLogicState,
            inventory: itemMaxes,
        };
        return search(logic, exits, state);
    },
);

const skyKeepNonprogressSelector = createSelector(
    [settingsSelector],
    (settings) =>
        settings['empty-unrequired-dungeons'] === true &&
        (settings['triforce-required'] === false ||
            settings['triforce-shuffle'] === 'Anywhere'),
);

const areaNonprogressSelector = createSelector(
    [
        skyKeepNonprogressSelector,
        settingSelector('empty-unrequired-dungeons'),
        requiredDungeonsSelector,
    ],
    (skyKeepNonprogress, emptyUnrequiredDungeons, requiredDungeons) => {
        return (area: string) =>
            area === 'Sky Keep'
                ? skyKeepNonprogress
                : emptyUnrequiredDungeons && isDungeon(area)
                  ? !requiredDungeons.includes(area)
                  : false;
    },
);

const areaHiddenSelector = createSelector(
    [
        areaNonprogressSelector,
        settingSelector('randomize-entrances'),
        settingSelector('randomize-dungeon-entrances'),
    ],
    (areaNonprogress, randomEntranceSetting, randomDungeonEntranceSetting) => {
        const dungeonEntranceSetting =
            randomDungeonEntranceSetting ?? randomEntranceSetting;
        return (area: string) =>
            areaNonprogress(area) &&
            (!isDungeon(area) ||
                (area === 'Sky Keep' &&
                    dungeonEntranceSetting !==
                        'All Surface Dungeons + Sky Keep'));
    },
);

export const isCheckBannedSelector = createSelector(
    [
        logicSelector,
        areaNonprogressSelector,
        settingSelector('excluded-locations'),
        settingSelector('rupeesanity'),
        settingSelector('shopsanity'),
        settingSelector('beedle-shopsanity'),
        settingSelector('rupin-shopsanity'),
        settingSelector('luv-shopsanity'),
        settingSelector('tadtonesanity'),
        settingSelector('treasuresanity-in-silent-realms'),
        settingSelector('trial-treasure-amount'),
        settingSelector('hint-distribution'),
    ],
    (
        logic,
        areaNonprogress,
        bannedLocations,
        rupeeSanity,
        shopSanity,
        beedleShopsanity,
        rupinShopSanity,
        luvShopSanity,
        tadtoneSanity,
        silentRealmTreasuresanity,
        silentRealmTreasureAmount,
        hintDistro,
    ) => {
        const bannedChecks = new Set(bannedLocations);
        const rupeesExcluded =
            rupeeSanity === 'Vanilla' || rupeeSanity === false;
        const maxRelics = silentRealmTreasuresanity
            ? silentRealmTreasureAmount
            : 0;
        const banBeedle =
            shopSanity !== undefined
                ? shopSanity !== true
                : beedleShopsanity !== true;
        const banGearShop = rupinShopSanity !== true;
        const banPotionShop = luvShopSanity !== true;

        const trialTreasurePattern = /Relic (\d+)/;
        const isExcessRelic = (check: Location2) => {
            if (check.type === 'trial_treasure') {
                const match = check.name.match(trialTreasurePattern);
                return match && parseInt(match[1], 10) > maxRelics;
            }
        };

        const isBannedCubeCheckViaChest = (
            checkId: string,
            check: Location2,
        ) => {
            return (
                check.type === 'tr_cube' &&
                bannedChecks.has(
                    logic.locations[cubeCheckToGoddessChestCheck[checkId]].name,
                )
            );
        };

        const isBannedChestViaCube = (checkId: string) => {
            const cube = goddessChestCheckToCubeCheck[checkId];
            const hintRegion = logic.hintRegions.checkHintRegions[cube];
            return cube && areaNonprogress(hintRegion);
        };

        const gossipStoneUsed =
            doesHintDistroUseGossipStone[hintDistro] ?? stubTrue;

        return (checkId: string) => {
            const check = logic.locations[checkId];
            return (
                bannedChecks.has(check.name) ||
                areaNonprogress(logic.hintRegions.checkHintRegions[checkId]) ||
                isExcessRelic(check) ||
                isBannedChestViaCube(checkId) ||
                isBannedCubeCheckViaChest(checkId, check) ||
                (rupeesExcluded && check.type === 'rupee') ||
                (banBeedle && check.type === 'beedle_shop') ||
                (banGearShop && check.type === 'gear_shop') ||
                (banPotionShop && check.type === 'potion_shop') ||
                (!tadtoneSanity && check.type === 'tadtone') ||
                (check.type === 'gossip_stone' && !gossipStoneUsed(checkId))
            );
        };
    },
);

const dungeonKeyLogicSelector = createSelector(
    [
        logicSelector,
        exitsSelector,
        settingSelector('logic-mode'),
        settingSelector('boss-key-mode'),
        settingSelector('small-key-mode'),
        isCheckBannedSelector,
        optimisticSearchSelector,
    ],
    keyData,
);

export const locationsForItemSelector = currySelector(
    createSelector(
        [
            checkHintsSelector,
            logicSelector,
            (_state: RootState, item: InventoryItem) => item,
        ],
        (checkHints, logic, item) =>
            Object.entries(checkHints)
                .filter(([, itemHint]) => itemHint === item)
                .map(([location, _]) => logic.locations[location].name),
    ),
);

const semiLogicSearchSelector = createSelector(
    [
        logicSelector,
        exitsSelector,
        isCheckBannedSelector,
        checkedChecksSelector,
        inLogicSearchSelector,
        dungeonKeyLogicSelector,
        checkHintsSelector,
        trickSemiLogicSelector,
    ],
    computeSemiLogic,
);

export const getRequirementLogicalStateSelector = createSelector(
    [inLogicSearchSelector, semiLogicSearchSelector],
    (inLogicState, semiLogicState) =>
        (requirement: TooltipRequirement2): LogicalState => {
            const checkWith = (state: SearchState2): boolean =>
                evaluateRequirement(state, requirement, TimeOfDay.Both);

            return checkWith(inLogicState)
                ? 'inLogic'
                : checkWith(semiLogicState.semiLogicSearchState)
                  ? 'semiLogic'
                  : checkWith(semiLogicState.trickLogicSearchState)
                    ? 'trickLogic'
                    : 'outLogic';
        },
);

export const getLocationLogicalStateSelector = createSelector(
    [inLogicSearchSelector, semiLogicSearchSelector],
    (inLogicState, semiLogicState) =>
        (location: string): LogicalState => {
            return inLogicState.reachableChecks.has(location)
                ? 'inLogic'
                : semiLogicState.semiLogicSearchState.reachableChecks.has(
                        location,
                    )
                  ? 'semiLogic'
                  : semiLogicState.trickLogicSearchState.reachableChecks.has(
                          location,
                      )
                    ? 'trickLogic'
                    : 'outLogic';
        },
);

export const getExitLogicalStateSelector = createSelector(
    [inLogicSearchSelector, semiLogicSearchSelector],
    (inLogicState, semiLogicState) =>
        (location: string): LogicalState => {
            return inLogicState.reachableExits.has(location)
                ? 'inLogic'
                : semiLogicState.semiLogicSearchState.reachableExits.has(
                        location,
                    )
                  ? 'semiLogic'
                  : semiLogicState.trickLogicSearchState.reachableExits.has(
                          location,
                      )
                    ? 'trickLogic'
                    : 'outLogic';
        },
);

export const dungeonCompletedSelector = currySelector(
    createSelector(
        [
            (_state: RootState, name: DungeonName) => name,
            // This dependency is the wrong way around, I think
            checkItemsSelector,
        ],
        (name, checkItems) => Boolean(checkItems[dungeonCompletionItems[name]]),
    ),
);

export const checkSelector = currySelector(
    createSelector(
        [
            (_state: RootState, checkId: string) => checkId,
            logicSelector,
            getLocationLogicalStateSelector,
            checkedChecksSelector,
            mappedExitsSelector,
        ],
        (
            checkId,
            logic,
            getLocationLogicalState,
            checkedChecks,
            mappedExits,
        ): Check => {
            const logicalState = getLocationLogicalState(checkId);

            if (logic.locations[checkId]) {
                const checkName = logic.locations[checkId].name;
                const shortCheckName = checkName.includes('-')
                    ? checkName.substring(checkName.indexOf('-') + 1).trim()
                    : checkName;
                return {
                    checked: checkedChecks.has(checkId),
                    checkId,
                    checkName: shortCheckName,
                    type: logic.locations[checkId].type,
                    logicalState,
                };
            } else if (logic.exits[checkId]) {
                const shortCheckName = logic.exits[checkId].name;
                return {
                    checked: Boolean(mappedExits[checkId]),
                    checkId,
                    checkName: shortCheckName,
                    type: 'exit',
                    logicalState,
                };
            } else if (checkId !== '') {
                throw new Error('unknown check ' + checkId);
            }
            return undefined as unknown as Check;
        },
    ),
);

export const areasSelector = createSelector(
    [
        logicSelector,
        checkedChecksSelector,
        exitsSelector,
        isCheckBannedSelector,
        getLocationLogicalStateSelector,
        getExitLogicalStateSelector,
        areaNonprogressSelector,
        areaHiddenSelector,
        counterBasisSelector,
    ],
    (
        logic,
        checkedChecks,
        allExits,
        isCheckBanned,
        getLocationLogicalState,
        getExitLogicalState,
        isAreaNonprogress,
        isAreaHidden,
        counterBasis,
    ): HintRegion[] => {
        const exitsById = keyBy(allExits, (e) => e.exit.id);
        return compact(
            logic.hintRegions.hintRegions.map(
                (area): HintRegion | undefined => {
                    const checks = logic.hintRegions.checksByHintRegion[area];
                    // Loose crystal checks can be banned to not require picking them up
                    // in logic, but we want to allow marking them as collected.
                    const progressChecks = checks.filter(
                        (check) =>
                            !isCheckBanned(check) ||
                            logic.locations[check].type === 'loose_crystal',
                    );

                    const [extraChecks, regularChecks_] = partition(
                        progressChecks,
                        (check) =>
                            logic.locations[check].type === 'gossip_stone' ||
                            logic.locations[check].type === 'tr_cube' ||
                            logic.locations[check].type === 'loose_crystal',
                    );

                    const nonProgress = isAreaNonprogress(area);
                    const hidden = isAreaHidden(area);
                    const regularChecks = nonProgress ? [] : regularChecks_;
                    const shouldCount = (state: LogicalState) =>
                        counterBasis === 'logic'
                            ? state === 'inLogic'
                            : state !== 'outLogic';

                    const checkGroup = (checks: string[]): CheckGroup => {
                        const nonBannedChecks = checks.filter(
                            (c) => !isCheckBanned(c),
                        );
                        const remaining = nonBannedChecks.filter(
                            (c) => !checkedChecks.has(c),
                        );
                        const accessible = remaining.filter((c) =>
                            shouldCount(getLocationLogicalState(c)),
                        );
                        return {
                            // Intentionally include banned but shown checks in the list
                            // of checks, but do not count them anywhere!
                            list: checks,
                            numTotal: nonBannedChecks.length,
                            numAccessible: accessible.length,
                            numRemaining: remaining.length,
                        };
                    };

                    const extraLocations: HintRegion<string>['extraLocations'] =
                        mapValues(
                            groupBy(
                                extraChecks,
                                (check) => logic.locations[check].type,
                            ),
                            checkGroup,
                        );

                    const relevantExits = logic.hintRegions.exitsByHintRegion[
                        area
                    ].filter((e) => {
                        const exitMapping = exitsById[e];
                        if (!exitMapping) {
                            return false;
                        }
                        return (
                            exitMapping.canAssign &&
                            exitMapping.rule.type === 'random'
                        );
                    });

                    const remainingExits = relevantExits.filter((e) => {
                        const exitMapping = exitsById[e];
                        return !exitMapping.entrance;
                    });

                    const accessibleExits = remainingExits.filter((e) => {
                        const exitMapping = exitsById[e];
                        return (
                            exitMapping.rule.type === 'random' &&
                            !exitMapping.rule.isKnownIrrelevant &&
                            shouldCount(getExitLogicalState(e))
                        );
                    });

                    extraLocations.exits = {
                        list: relevantExits,
                        numAccessible: accessibleExits.length,
                        numRemaining: remainingExits.length,
                        numTotal: relevantExits.length,
                    } satisfies CheckGroup;

                    return {
                        checks: checkGroup(regularChecks),
                        extraLocations,
                        nonProgress,
                        hidden,
                        name: area,
                    };
                },
            ),
        );
    },
);

export const totalCountersSelector = createSelector(
    [areasSelector, exitsByIdSelector],
    (areas, exits) => {
        const numChecked = sumBy(
            areas,
            (a) => a.checks.numTotal - a.checks.numRemaining,
        );
        const numAccessible = sumBy(areas, (a) => a.checks.numAccessible);
        const numRemaining = sumBy(areas, (a) => a.checks.numRemaining);
        let numExitsAccessible = sumBy(
            areas,
            (a) => a.extraLocations.exits?.numAccessible ?? 0,
        );

        const startMapping = exits['\\Start'];
        const needsStartingEntrance = !startMapping.entrance;
        if (needsStartingEntrance) {
            numExitsAccessible++;
        }
        return {
            numChecked,
            numAccessible,
            numRemaining,
            numExitsAccessible,
        };
    },
);

export const usedEntrancesSelector = createSelector(
    [entrancePoolsSelector, exitsSelector],
    getUsedEntrances,
);
