import { createSelector } from '@reduxjs/toolkit';
import {
    areaGraphSelector,
    logicSelector,
    optionsSelector,
} from '../logic/selectors';
import { TypedOptions } from '../permalink/SettingsTypes';
import { RootState } from '../store/store';
import { currySelector } from '../utils/redux';
import {
    completeTriforceReq,
    gotOpeningReq,
    gotRaisingReq,
    hordeDoorReq,
    impaSongCheck,
    knownNoGossipStoneHintDistros,
    swordsToAdd,
} from '../logic/ThingsThatWouldBeNiceToHaveInTheDump';
import {
    HintRegion,
    Check,
    DungeonName,
    ExitMapping,
    dungeonNames,
    isDungeon,
    LogicalState,
} from '../logic/Locations';
import { Logic, LogicalCheck, itemName } from '../logic/Logic';
import {
    cubeCheckToCubeCollected,
    cubeCheckToGoddessChestCheck,
    dungeonCompletionItems,
    goddessChestCheckToCubeCheck,
    sothItemReplacement,
    sothItems,
    triforceItemReplacement,
    triforceItems,
} from '../logic/TrackerModifications';
import _ from 'lodash';
import { LogicalExpression } from '../logic/bitlogic/LogicalExpression';
import { SettingsQuery, TimeOfDay } from '../logic/UpstreamTypes';
import {
    Requirements,
    computeLeastFixedPoint,
    mergeRequirements,
} from '../logic/bitlogic/BitLogic';
import { validateSettings } from '../permalink/Settings';
import { LogicBuilder } from '../logic/LogicBuilder';
import { exploreAreaGraph } from '../logic/Pathfinding';
import { keyData } from '../logic/KeyLogic';
import { BitVector } from '../logic/bitlogic/BitVector';
import { InventoryItem, itemMaxes } from '../logic/Inventory';
import {
    getAllowedStartingEntrances,
    getEntrancePools,
    getExitRules,
    getExits,
    getUsedEntrances,
} from '../logic/Entrances';
import {
    computeSemiLogic,
    getVisibleTricksEnabledRequirements,
} from '../logic/SemiLogic';
import {
    counterBasisSelector,
    trickSemiLogicSelector,
    trickSemiLogicTrickListSelector,
} from '../customization/selectors';

const bitVectorMemoizeOptions = {
    memoizeOptions: {
        resultEqualityCheck: (a: BitVector, b: BitVector) =>
            a instanceof BitVector && b instanceof BitVector && a.equals(b),
    },
};

/**
 * Selects the hint for a given area.
 */
export const areaHintSelector = currySelector(
    (state: RootState, area: string) => state.tracker.hints[area],
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

/**
 * Selects ALL settings, even the ones not logically relevant.
 */
export const allSettingsSelector = createSelector(
    [optionsSelector, (state: RootState) => state.tracker.settings],
    validateSettings,
);

/**
 * Selects the current logical settings.
 */
export const settingsSelector: (state: RootState) => TypedOptions =
    allSettingsSelector;

/**
 * Selects a particular logical settings value.
 */
export const settingSelector: <K extends keyof TypedOptions>(
    setting: K,
) => (state: RootState) => TypedOptions[K] = currySelector(
    <K extends keyof TypedOptions>(
        state: RootState,
        setting: K,
    ): TypedOptions[K] => settingsSelector(state)[setting],
);

export const rawItemCountsSelector = (state: RootState) =>
    state.tracker.inventory;

/** A map of all actual items to their counts. Since redux only stores partial counts, this ensures all items are present. */
export const inventorySelector = createSelector(
    [rawItemCountsSelector],
    (rawInventory) =>
        _.mapValues(
            itemMaxes,
            (_val, item) => rawInventory[item as InventoryItem] ?? 0,
        ),
    { memoizeOptions: { resultEqualityCheck: _.isEqual } },
);

export const rawItemCountSelector = currySelector(
    (state: RootState, item: InventoryItem) =>
        inventorySelector(state)[item] ?? 0,
);

export const checkedChecksSelector = createSelector(
    [(state: RootState) => state.tracker.checkedChecks],
    (checkedChecks) => new Set(checkedChecks),
);

function getNumLooseGratitudeCrystals(
    logic: Logic,
    checkedChecks: Set<string>,
) {
    return [...checkedChecks].filter(
        (check) => logic.checks[check]?.type === 'loose_crystal',
    ).length;
}

export function getAdditionalItems(
    logic: Logic,
    inventory: Record<InventoryItem, number>,
    checkedChecks: Set<string>,
) {
    const result: Record<string, number> = {};
    // Completed dungeons
    for (const [dungeon, completionCheck] of Object.entries(
        logic.dungeonCompletionRequirements,
    )) {
        if (checkedChecks.has(completionCheck)) {
            result[dungeonCompletionItems[dungeon]] = 1;
        }
    }

    if (inventory['Triforce'] === 3) {
        result[dungeonCompletionItems['Sky Keep']] = 1;
    }

    // If this is a goddess cube check, mark the requirement as checked
    // since this is the requirement used by the goddess chests.
    for (const check of checkedChecks) {
        const cubeCollectedItem = cubeCheckToCubeCollected[check];
        if (cubeCollectedItem) {
            result[cubeCollectedItem] = 1;
        }
    }

    const looseCrystals = getNumLooseGratitudeCrystals(logic, checkedChecks);
    result['Gratitude Crystal'] = looseCrystals;
    return result;
}

export const checkItemsSelector = createSelector(
    [logicSelector, inventorySelector, checkedChecksSelector],
    getAdditionalItems,
    { memoizeOptions: { resultEqualityCheck: _.isEqual } },
);

export const totalGratitudeCrystalsSelector = createSelector(
    [
        logicSelector,
        checkedChecksSelector,
        rawItemCountSelector('Gratitude Crystal Pack'),
    ],
    (logic, checkedChecks, packCount) => {
        const looseCrystalCount = getNumLooseGratitudeCrystals(
            logic,
            checkedChecks,
        );
        return packCount * 5 + looseCrystalCount;
    },
);

export const allowedStartingEntrancesSelector = createSelector(
    [logicSelector, settingSelector('random-start-entrance')],
    getAllowedStartingEntrances,
);

/**
 * Describes which entrances are available for a given pool (dungeons, silent realms, starting, ...)
 */
export const entrancePoolsSelector = createSelector(
    [areaGraphSelector, allowedStartingEntrancesSelector],
    getEntrancePools,
);

const mappedExitsSelector = (state: RootState) => state.tracker.mappedExits;

/** Defines how exits should be resolved. */
export const exitRulesSelector = createSelector(
    [
        logicSelector,
        settingSelector('random-start-entrance'),
        settingSelector('randomize-entrances'),
        settingSelector('randomize-dungeon-entrances'),
        settingSelector('randomize-trials'),
        settingSelector('random-start-statues'),
    ],
    getExitRules,
);

export const exitsSelector = createSelector(
    [logicSelector, exitRulesSelector, mappedExitsSelector],
    getExits,
);

const skyKeepRequiredSelector = (state: RootState) => {
    const settings = settingsSelector(state);
    if (!settings['triforce-required']) {
        return false;
    }
    return settings['triforce-shuffle'] !== 'Anywhere';
};

export const requiredDungeonsSelector = createSelector(
    [
        (state: RootState) => state.tracker.requiredDungeons,
        settingSelector('required-dungeon-count'),
        skyKeepRequiredSelector,
    ],
    (selectedRequiredDungeons, numRequiredDungeons, skyKeepRequired) => {
        // Enforce consistent order
        return dungeonNames.filter((d) =>
            d === 'Sky Keep'
                ? skyKeepRequired
                : numRequiredDungeons === 6 ||
                  selectedRequiredDungeons.includes(d),
        );
    },
);

/**
 * Selects the requirements that depend on state/settings, but should still be revealed during
 * tooltip computations. Any recalculations here will cause the tooltips cache to throw away its
 * cached tooltips and recalculate requirements (after logic has loaded, this is only settings, mapped exits, and required dungeons).
 */
export const settingsRequirementsSelector = createSelector(
    [
        logicSelector,
        settingsSelector,
        exitsSelector,
        requiredDungeonsSelector,
    ],
    mapSettings,
);

function evalCondition(
    condition: SettingsQuery,
    settings: TypedOptions,
    requiredDungeons: string[],
) {

    const evalInner = () => {
        const ty = condition.type;
        switch (ty) {
            case 'query': {
                const settingsValue = settings[condition.option as keyof TypedOptions];
                // eslint-disable-next-line sonarjs/no-nested-switch
                switch (condition.op) {
                    case 'eq':
                        return settingsValue === condition.value;
                    case 'in':
                        return Array.isArray(settingsValue) && settingsValue.includes(condition.value as string);
                    case 'lt':
                        return (settingsValue as number) < (condition.value as number);
                    case 'gt':
                        return (settingsValue as number) > (condition.value as number);
                    default:
                        console.warn('unknown op', condition.op)
                        return false;
                }
            }
            case 'req_dungeon':
                return requiredDungeons.includes(condition.dungeon);
            default:
                console.warn('unknown options type', ty)
                return false;
        }
    }    

    return evalInner() !== condition.negation;
}

function mapSettings(
    logic: Logic,
    settings: TypedOptions,
    exits: ExitMapping[],
    requiredDungeons: string[],
) {
    const requirements: Requirements = {};
    const b = new LogicBuilder(logic.allItems, logic.itemLookup, requirements);

    for (const [requirement, condition] of Object.entries(
        logic.optionConditions,
    )) {
        if (evalCondition(condition, settings, requiredDungeons)) {
            b.trySet(requirement, b.true());
        }
    }

    const raiseGotExpr =
        settings['got-start'] === 'Raised'
            ? b.true()
            : b.singleBit(impaSongCheck);
    const neededSwords = swordsToAdd[settings['got-sword-requirement']];
    let openGotExpr = b.singleBit(`Progressive Sword x ${neededSwords}`);
    let hordeDoorExpr = settings['triforce-required']
        ? b.singleBit(completeTriforceReq)
        : b.true();

    const allRequiredDungeonsBits = requiredDungeons.reduce((acc, dungeon) => {
        if (dungeon !== 'Sky Keep') {
            acc.setBit(logic.itemBits[dungeonCompletionItems[dungeon]]);
        }
        return acc;
    }, new BitVector());
    const dungeonsExpr = new LogicalExpression([allRequiredDungeonsBits]);

    if (settings['got-dungeon-requirement'] === 'Required') {
        openGotExpr = openGotExpr.and(dungeonsExpr);
    } else if (settings['got-dungeon-requirement'] === 'Unrequired') {
        hordeDoorExpr = hordeDoorExpr.and(dungeonsExpr);
    }

    b.set(gotOpeningReq, openGotExpr);
    b.set(gotRaisingReq, raiseGotExpr);
    b.set(hordeDoorReq, hordeDoorExpr);

    const mapConnection = (from: string, to: string) => {
        const exitArea = logic.areaGraph.areasByExit[from];
        const exitExpr = b.singleBit(from);

        let dayReq: LogicalExpression;
        let nightReq: LogicalExpression;

        if (exitArea.availability === 'abstract') {
            dayReq = exitExpr;
            nightReq = exitExpr;
        } else if (exitArea.availability === TimeOfDay.Both) {
            dayReq = exitExpr.and(b.singleBit(b.day(exitArea.id)));
            nightReq = exitExpr.and(b.singleBit(b.night(exitArea.id)));
        } else if (exitArea.availability === TimeOfDay.DayOnly) {
            dayReq = exitExpr;
            nightReq = b.false();
        } else if (exitArea.availability === TimeOfDay.NightOnly) {
            dayReq = b.false();
            nightReq = exitExpr;
        } else {
            throw new Error('bad ToD');
        }

        const entranceDef = logic.areaGraph.entrances[to];
        if (entranceDef.allowed_time_of_day === TimeOfDay.Both) {
            b.addAlternative(b.day(to), dayReq);
            b.addAlternative(b.night(to), nightReq);
        } else if (entranceDef.allowed_time_of_day === TimeOfDay.DayOnly) {
            b.addAlternative(to, dayReq);
        } else if (entranceDef.allowed_time_of_day === TimeOfDay.NightOnly) {
            b.addAlternative(to, nightReq);
        } else {
            throw new Error('bad ToD');
        }
    };

    for (const mapping of exits) {
        if (mapping.entrance) {
            mapConnection(mapping.exit.id, mapping.entrance.id);
        }
    }

    return requirements;
}

export const inventoryRequirementsSelector = createSelector(
    [logicSelector, inventorySelector],
    mapInventory,
);

export function mapInventory(logic: Logic, itemCounts: Record<string, number>) {
    const requirements: Requirements = {};
    const b = new LogicBuilder(logic.allItems, logic.itemLookup, requirements);

    for (const [item, count] of Object.entries(itemCounts)) {
        if (
            count === undefined ||
            item === 'Sailcloth' ||
            item === 'Tumbleweed'
        ) {
            continue;
        }
        if (item === sothItemReplacement) {
            for (let i = 1; i <= count; i++) {
                b.set(sothItems[i - 1], b.true());
            }
        } else if (item === triforceItemReplacement) {
            for (let i = 1; i <= count; i++) {
                b.set(triforceItems[i - 1], b.true());
            }
        } else {
            for (let i = 1; i <= count; i++) {
                b.set(itemName(item, i), b.true());
            }
        }
    }

    return requirements;
}

export const checkRequirementsSelector = createSelector(
    [logicSelector, checkItemsSelector],
    mapInventory,
);

export const inLogicBitsSelector = createSelector(
    [
        logicSelector,
        settingsRequirementsSelector,
        inventoryRequirementsSelector,
        checkRequirementsSelector,
    ],
    (logic, settingsRequirements, inventoryRequirements, checkRequirements) =>
        computeLeastFixedPoint(
            'Logical state',
            mergeRequirements(
                logic.numRequirements,
                logic.staticRequirements,
                settingsRequirements,
                inventoryRequirements,
                checkRequirements,
            ),
        ),
    bitVectorMemoizeOptions,
);

const optimisticInventoryItemRequirementsSelector = createSelector(
    [logicSelector],
    (logic) => mapInventory(logic, itemMaxes),
);

/**
 * A selector that computes logical state as if you had gotten every item.
 * Useful for checking if something is out of logic because of missing
 * items or generally unreachable because of missing entrances.
 */
export const optimisticLogicBitsSelector = createSelector(
    [
        logicSelector,
        settingsRequirementsSelector,
        optimisticInventoryItemRequirementsSelector,
        // TODO this should probably also treat all check requirements as available? E.g. dungeons completed, cubes gotten?
        checkRequirementsSelector,
        inLogicBitsSelector,
    ],
    (
        logic,
        settingsRequirements,
        optimisticInventoryRequirements,
        checkRequirements,
        inLogicBits,
    ) =>
        computeLeastFixedPoint(
            'Optimistic state',
            mergeRequirements(
                logic.numRequirements,
                logic.staticRequirements,
                settingsRequirements,
                optimisticInventoryRequirements,
                checkRequirements,
            ),
            inLogicBits,
        ),
    bitVectorMemoizeOptions,
);

export const skyKeepNonprogressSelector = createSelector(
    [settingsSelector],
    (settings) =>
        settings['empty-unrequired-dungeons'] === true &&
        (settings['triforce-required'] === false ||
            settings['triforce-shuffle'] === 'Anywhere'),
);

export const areaNonprogressSelector = createSelector(
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

export const areaHiddenSelector = createSelector(
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

const isCheckBannedSelector = createSelector(
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
        const isExcessRelic = (check: LogicalCheck) => {
            if (check.type === 'trial_treasure') {
                const match = check.name.match(trialTreasurePattern);
                return match && parseInt(match[1], 10) > maxRelics;
            }
        };

        const isBannedCubeCheckViaChest = (
            checkId: string,
            check: LogicalCheck,
        ) => {
            return (
                check.type === 'tr_cube' &&
                bannedChecks.has(
                    logic.checks[cubeCheckToGoddessChestCheck[checkId]].name,
                )
            );
        };

        const isBannedChestViaCube = (checkId: string) => {
            const cube = goddessChestCheckToCubeCheck[checkId];
            return cube && areaNonprogress(logic.checks[cube].area!);
        };

        const gossipStonesBanned =
            knownNoGossipStoneHintDistros.includes(hintDistro);

        return (checkId: string, check: LogicalCheck) =>
            // Loose crystal checks can be banned to not require picking them up
            // in logic, but we want to allow marking them as collected.
            (check.type !== 'loose_crystal' &&
                (bannedChecks.has(check.name) ||
                    areaNonprogress(logic.checks[checkId].area!))) ||
            isExcessRelic(check) ||
            isBannedChestViaCube(checkId) ||
            isBannedCubeCheckViaChest(checkId, check) ||
            (rupeesExcluded && check.type === 'rupee') ||
            (banBeedle && check.type === 'beedle_shop') ||
            (banGearShop && check.type === 'gear_shop') ||
            (banPotionShop && check.type === 'potion_shop') ||
            (!tadtoneSanity && check.type === 'tadtone') || 
            (gossipStonesBanned && check.type === 'gossip_stone');
    },
);

const dungeonKeyLogicSelector = createSelector(
    [
        logicSelector,
        settingSelector('boss-key-mode'),
        settingSelector('small-key-mode'),
        settingsRequirementsSelector,
        checkRequirementsSelector,
        isCheckBannedSelector,
        optimisticLogicBitsSelector,
    ],
    keyData,
);

/** A selector for the requirements that assume every trick enabled in customization is enabled. */
const visibleTricksRequirementsSelector = createSelector(
    [
        logicSelector,
        settingsSelector,
        trickSemiLogicTrickListSelector,
    ],
    getVisibleTricksEnabledRequirements,
);

export const inTrickLogicBitsSelector = createSelector(
    [
        logicSelector,
        inLogicBitsSelector,
        settingsRequirementsSelector,
        inventoryRequirementsSelector,
        checkRequirementsSelector,
        visibleTricksRequirementsSelector,
    ],
    (
        logic,
        inLogicBits,
        settingsRequirements,
        inventoryRequirements,
        checkRequirements,
        allTricksRequirements,
    ) =>
        computeLeastFixedPoint(
            'TrickLogic state',
            mergeRequirements(
                logic.numRequirements,
                logic.staticRequirements,
                settingsRequirements,
                inventoryRequirements,
                checkRequirements,
                allTricksRequirements,
            ),
            inLogicBits,
        ),
);

const semiLogicBitsSelector = createSelector(
    [
        logicSelector,
        checkedChecksSelector,
        inventorySelector,
        inLogicBitsSelector,
        dungeonKeyLogicSelector,
        settingsRequirementsSelector,
        checkHintsSelector,
        trickSemiLogicSelector,
        visibleTricksRequirementsSelector,
    ],
    computeSemiLogic,
);

export const getRequirementLogicalStateSelector = createSelector(
    [logicSelector, inLogicBitsSelector, semiLogicBitsSelector],
    (logic, inLogicBits, semiLogicBits) =>
        (requirement: string): LogicalState => {
            const bit = logic.itemBits[requirement];
            return inLogicBits.test(bit)
                ? 'inLogic'
                : semiLogicBits.inSemiLogicBits.test(bit)
                    ? 'semiLogic'
                    : semiLogicBits.inTrickLogicBits.test(bit)
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
            getRequirementLogicalStateSelector,
            checkedChecksSelector,
            mappedExitsSelector,
        ],
        (
            checkId,
            logic,
            getRequirementLogicalState,
            checkedChecks,
            mappedExits,
        ): Check => {
            const logicalState = getRequirementLogicalState(checkId);

            if (logic.checks[checkId]) {
                const checkName = logic.checks[checkId].name;
                const shortCheckName = checkName.includes('-')
                    ? checkName.substring(checkName.indexOf('-') + 1).trim()
                    : checkName;
                return {
                    checked: checkedChecks.has(checkId),
                    checkId,
                    checkName: shortCheckName,
                    type: logic.checks[checkId].type,
                    logicalState,
                };
            } else if (logic.areaGraph.exits[checkId]) {
                const shortCheckName =
                    logic.areaGraph.exits[checkId].short_name;
                return {
                    checked: Boolean(mappedExits[checkId]),
                    checkId,
                    checkName: shortCheckName,
                    type: 'exit',
                    logicalState,
                };
            } else {
                throw new Error('unknown check ' + checkId);
            }
        },
    ),
);

export const areasSelector = createSelector(
    [
        logicSelector,
        checkedChecksSelector,
        isCheckBannedSelector,
        getRequirementLogicalStateSelector,
        areaNonprogressSelector,
        areaHiddenSelector,
        exitRulesSelector,
        counterBasisSelector,
    ],
    (
        logic,
        checkedChecks,
        isCheckBanned,
        getLogicalState,
        isAreaNonprogress,
        isAreaHidden,
        exitRules,
        counterBasis,
    ): HintRegion[] =>
        _.compact(
            logic.hintRegions.map((area): HintRegion | undefined => {
                const checks = logic.checksByHintRegion[area];
                const progressChecks = checks.filter(
                    (check) => !isCheckBanned(check, logic.checks[check]),
                );

                const [extraChecks, regularChecks_] = _.partition(
                    progressChecks,
                    (check) =>
                        logic.checks[check].type === 'gossip_stone' ||
                        logic.checks[check].type === 'tr_cube' ||
                        logic.checks[check].type === 'loose_crystal',
                );

                const nonProgress = isAreaNonprogress(area);
                const hidden = isAreaHidden(area);
                const regularChecks = nonProgress ? [] : regularChecks_;

                const remaining = regularChecks.filter(
                    (check) => !checkedChecks.has(check),
                );

                const shouldCount = (state: LogicalState) =>
                    counterBasis === 'logic'
                        ? state === 'inLogic'
                        : state !== 'outLogic';

                const inLogic = remaining.filter((check) =>
                    shouldCount(getLogicalState(check)),
                );

                const exits = logic.exitsByHintRegion[area].filter(
                    (exit) => exitRules[exit]?.type === 'random',
                );

                return {
                    checks: regularChecks,
                    exits,
                    numTotalChecks: regularChecks.length,
                    extraChecks: _.groupBy(
                        extraChecks,
                        (check) => logic.checks[check].type,
                    ),
                    nonProgress,
                    hidden,
                    name: area,
                    numChecksRemaining: remaining.length,
                    numChecksAccessible: inLogic.length,
                };
            }),
        ),
);

export const totalCountersSelector = createSelector(
    [areasSelector],
    (areas) => {
        const numChecked = _.sumBy(
            areas,
            (a) => a.numTotalChecks - a.numChecksRemaining,
        );
        const numAccessible = _.sumBy(areas, (a) => a.numChecksAccessible);
        const numRemaining = _.sumBy(areas, (a) => a.numChecksRemaining);
        return {
            numChecked,
            numAccessible,
            numRemaining,
        };
    },
);

export const usedEntrancesSelector = createSelector(
    [entrancePoolsSelector, exitsSelector],
    getUsedEntrances,
);

export const inLogicPathfindingSelector = createSelector(
    [areaGraphSelector, exitsSelector, inLogicBitsSelector],
    exploreAreaGraph,
);

export const optimisticPathfindingSelector = createSelector(
    [areaGraphSelector, exitsSelector, optimisticLogicBitsSelector],
    exploreAreaGraph,
);
