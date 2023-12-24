import { createSelector } from '@reduxjs/toolkit';
import { logicSelector, optionsSelector } from '../logic/selectors';
import { OptionDefs, TypedOptions } from '../permalink/SettingsTypes';
import { RootState } from '../store/store';
import { currySelector } from '../utils/redux';
import { Items, TrackerState } from './slice';
import {
    bannedExitsAndEntrances,
    completeTriforceReq,
    dungeonCompletionRequirements,
    gotOpeningReq,
    gotRaisingReq,
    hordeDoorReq,
    impaSongCheck,
    nonRandomizedExits,
    runtimeOptions,
    swordsToAdd,
} from '../logic/ThingsThatWouldBeNiceToHaveInTheDump';
import {
    Area,
    Check,
    DungeonName,
    ExitMapping,
    RegularDungeon,
    dungeonNames,
    isDungeon,
} from '../logic/Locations';
import {
    AreaGraph,
    Logic,
    LogicalCheck,
} from '../logic/Logic';
import {
    canAccessCubeToCubeCheck,
    cubeCheckToCanAccessCube,
    cubeCheckToGoddessChestCheck,
    requiredDungeonsCompletedFakeRequirement,
    sothItemReplacement,
    sothItems,
    triforceItemReplacement,
    triforceItems,
} from '../logic/TrackerModifications';
import _ from 'lodash';
import { LogicalExpression } from '../logic/bitlogic/LogicalExpression';
import { TimeOfDay } from '../logic/UpstreamTypes';
import { interpretLogic } from '../logic/bitlogic/BitLogic';
import { validateSettings } from '../permalink/Settings';
import { LogicBuilder } from '../logic/LogicBuilder';

/**
 * Selects the hint for a given area.
 */
export const areaHintSelector = currySelector(
    (state: RootState, area: string) => state.tracker.hints[area],
);

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
    [optionsSelector, (state: RootState) => state.tracker.settings!],
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

export const rawItemCountSelector = currySelector(
    (state: RootState, item: Items) => state.tracker.inventory[item] ?? 0,
);

export const checkedChecksSelector = (state: RootState) =>
    state.tracker.checkedChecks;

function getNumLooseGratitudeCrystals(
    logic: Logic,
    checkedChecks: TrackerState['checkedChecks'],
) {
    return checkedChecks.filter(
        (check) => logic.checks[check]?.type === 'loose_crystal',
    ).length;
}

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

export const itemCountsSelector = createSelector(
    [logicSelector, rawItemCountsSelector, checkedChecksSelector],
    (logic, rawItemCounts, checkedChecks) => {
        const result = _.clone(rawItemCounts);
        result['Gratitude Crystal'] = getNumLooseGratitudeCrystals(
            logic,
            checkedChecks,
        );
        return result;
    },
);

export const allowedStartingEntrancesSelector = createSelector(
    [logicSelector, settingSelector('random-start-entrance')],
    (logic, randomizeStart) => {
        return Object.entries(logic.areaGraph.entrances)
            .filter(([, def]) => {
                if (def['can-start-at'] === false) {
                    return false;
                }

                switch (randomizeStart) {
                    case 'Vanilla':
                        return false;
                    case 'Bird Statues':
                        return def.subtype === 'bird-statue-entrance';
                    case 'Any Surface Region':
                    case 'Any':
                        return true;
                    default:
                        return true;
                }
            })
            .map(([id, def]) => ({
                id,
                name: def.short_name,
            }));
    },
);

const mappedExitsSelector = (state: RootState) => state.tracker.mappedExits;

type ExitMapSource =
    | {
          type: 'vanilla';
      }
    | {
          type: 'follow';
          otherExit: string;
      }
    | {
          type: 'linked';
          pool: keyof AreaGraph['entrancePools'];
          location: string;
      }
    | {
          type: 'randomStartingEntrance';
      }
    | {
          type: 'random';
      };

/** Defines how exits should be resolved. */
export const exitRulesSelector = createSelector(
    [
        logicSelector,
        settingSelector('random-start-entrance'),
        settingSelector('randomize-entrances'),
        settingSelector('randomize-dungeon-entrances'),
        settingSelector('randomize-trials'),
    ],
    (
        logic,
        startingEntranceSetting,
        randomEntranceSetting,
        randomDungeonEntranceSetting,
        randomTrialsSetting,
    ) => {
        const result: Record<string, ExitMapSource> = {};

        const followToCanonicalEntrance = _.invert(logic.areaGraph.autoExits);

        const everythingRandomized = randomEntranceSetting === 'All';
        const dungeonEntrancesRandomized = randomDungeonEntranceSetting
            ? randomDungeonEntranceSetting !== 'None'
            : randomEntranceSetting !== 'None';

        for (const exitId of Object.keys(logic.areaGraph.exits)) {
            if (bannedExitsAndEntrances.includes(exitId)) {
                continue;
            }

            if (exitId === '\\Start' && startingEntranceSetting !== 'Vanilla') {
                result[exitId] = { type: 'randomStartingEntrance' };
                continue;
            }

            if (followToCanonicalEntrance[exitId]) {
                result[exitId] = {
                    type: 'follow',
                    otherExit: followToCanonicalEntrance[exitId],
                };
                continue;
            }

            if (everythingRandomized) {
                // These don't appear to ever be randomized?
                if (
                    logic.areaGraph.exits[exitId].short_name.includes(
                        'First Time Dive',
                    ) ||
                    logic.areaGraph.exits[exitId].short_name.includes(
                        'Statue Dive',
                    )
                ) {
                    result[exitId] = { type: 'vanilla' };
                } else {
                    result[exitId] = { type: 'random' };
                }
                continue;
            }

            const poolData = (() => {
                for (const [pool_, locations] of Object.entries(
                    logic.areaGraph.entrancePools,
                )) {
                    const pool =
                        pool_ as keyof typeof logic.areaGraph.entrancePools;
                    for (const [location, linkage] of Object.entries(
                        locations,
                    )) {
                        if (linkage.exits[0] === exitId) {
                            return [pool, location, true] as const;
                        } else if (linkage.exits[1] === exitId) {
                            return [pool, location, false] as const;
                        }
                    }
                }
            })();

            if (poolData) {
                const [pool, location, isOutsideExit] = poolData;
                if (
                    (pool === 'dungeons' && dungeonEntrancesRandomized) ||
                    (pool === 'silent_realms' && randomTrialsSetting)
                ) {
                    if (isOutsideExit) {
                        result[exitId] = { type: 'random' };
                    } else {
                        result[exitId] = { type: 'linked', pool, location };
                    }
                    continue;
                }
            }

            result[exitId] = { type: 'vanilla' };
        }

        return result;
    },
);

// FIXME: The dungeon that appears in place of LMF has double exits, one will lead to Temple of Time.
// This isn't accounted for here

export const exitsSelector = createSelector(
    [logicSelector, exitRulesSelector, mappedExitsSelector],
    (logic, exitRules, mappedExits) => {
        const result: { [exitId: string]: ExitMapping } = {};
        const rules = Object.entries(exitRules);

        const makeEntrance = (
            entranceId: string | undefined,
        ): ExitMapping['entrance'] => {
            if (!entranceId) {
                return undefined;
            }
            const rawEntrance = logic.areaGraph.entrances[entranceId];
            if (rawEntrance) {
                return {
                    id: entranceId,
                    name: rawEntrance.short_name,
                    region: logic.areaGraph.entranceHintAreas[entranceId],
                };
            } else {
                console.error('unknown entrance', entranceId);
            }
        };
            
        const makeExit = (id: string): ExitMapping['exit'] => ({
            id,
            name: logic.areaGraph.exits[id].short_name,
        });

        for (const [exitId] of rules.filter(
            ([, rule]) => rule.type === 'vanilla',
        )) {
            result[exitId] = {
                canAssign: false,
                entrance: makeEntrance(
                    logic.areaGraph.vanillaConnections[exitId],
                ),
                exit: makeExit(exitId),
            };
        }

        for (const [exitId] of rules.filter(
            ([, rule]) =>
                rule.type === 'random' ||
                rule.type === 'randomStartingEntrance',
        )) {
            result[exitId] = {
                canAssign: true,
                entrance: makeEntrance(mappedExits[exitId]),
                exit: makeExit(exitId),
            };
        }

        for (const [exitId, rule] of rules.filter(
            ([, rule]) => rule.type === 'follow',
        )) {
            if (rule.type === 'follow') {
                result[exitId] = {
                    canAssign: false,
                    entrance: result[rule.otherExit].entrance,
                    exit: makeExit(exitId),
                };
            }
        }

        for (const [exitId, rule] of rules.filter(
            ([, rule]) => rule.type === 'linked',
        )) {
            if (rule.type === 'linked') {
                // This is unfortunately somewhat complex. This might be an exit like "ET - Main Exit",
                // and if the Deep Woods - Exit to SV leads to ET - Main Entrance, then we know this
                // exit leads to Deep Woods - Entrance from SV.
                const location = rule.location;
                const pool = logic.areaGraph.entrancePools[rule.pool];
                // This is the corresponding entrance for this exit
                const neededEntrance = pool[location].entrances[1];
                // Find the exit that was mapped to an entrance in this location
                const sourceLocation = Object.entries(pool).find(
                    ([, linkage]) =>
                        result[linkage.exits[0]].entrance?.id ===
                        neededEntrance,
                )?.[0];

                if (!sourceLocation) {
                    result[exitId] = {
                        canAssign: false,
                        entrance: undefined,
                        exit: makeExit(exitId),
                    };
                } else {
                    const reverseEntrance = pool[sourceLocation].entrances[0];
                    result[exitId] = {
                        canAssign: false,
                        entrance: makeEntrance(reverseEntrance),
                        exit: makeExit(exitId),
                    };
                }
            }
        }
        return _.sortBy(Object.values(result), (exit) => !exit.canAssign);
    },
);

/**
 * Selects the requirements that depend on state/settings, but should still be revealed during
 * tooltip computations. Any recalculations here will cause the tooltips cache to throw away its
 * cached tooltips and recalculate requirements (after logic has loaded, this is only settings and mapped exits).
 */
export const settingsImplicationsSelector = createSelector(
    [logicSelector, optionsSelector, settingsSelector, exitsSelector],
    mapSettings,
);

function mapSettings(
    logic: Logic,
    options: OptionDefs,
    settings: TypedOptions,
    exits: ExitMapping[],
) {
    const implications: { [bitIndex: number]: LogicalExpression } = {};
    const b = new LogicBuilder(logic.bitLogic, logic.allItems, implications);

    for (const option of runtimeOptions) {
        const [item, command, expect] = option;
        const val = settings[command];
        const match =
            val !== undefined &&
            (typeof expect === 'function' ? expect(val) : expect === val);
        if (match) {
            b.set(item, b.true());
        }
    }

    for (const option of options) {
        if (
            option.type === 'multichoice' &&
            (option.command === 'enabled-tricks-glitched' ||
                option.command === 'enabled-tricks-bitless')
        ) {
            const vals = settings[option.command];
            for (const option of vals) {
                b.set(`${option} Trick`, b.true());
            }
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

    const dungeonsExpr = b.singleBit(requiredDungeonsCompletedFakeRequirement);

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

        if (exitArea.abstract) {
            dayReq = exitExpr;
            nightReq = exitExpr;
        } else if (exitArea.allowedTimeOfDay === TimeOfDay.Both) {
            dayReq = exitExpr.and(b.singleBit(b.day(exitArea.name)));
            nightReq = exitExpr.and(b.singleBit(b.night(exitArea.name)));
        } else if (exitArea.allowedTimeOfDay === TimeOfDay.DayOnly) {
            dayReq = exitExpr;
            nightReq = b.false();
        } else if (exitArea.allowedTimeOfDay === TimeOfDay.NightOnly) {
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

    return implications;
}

export const inventoryImplicationsSelector = createSelector(
    [logicSelector, itemCountsSelector],
    mapInventory,
);

function mapInventory(logic: Logic, itemCounts: Record<string, number>) {
    const implications: { [bitIndex: number]: LogicalExpression } = {};
    const b = new LogicBuilder(logic.bitLogic, logic.allItems, implications);

    for (const [item, count] of Object.entries(itemCounts)) {
        if (count === undefined || item === 'Sailcloth') {
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
                if (i === 1) {
                    b.set(item, b.true());
                } else {
                    b.set(`${item} x ${i}`, b.true());
                }
            }
        }
    }

    return implications;
}

export const requiredDungeonsSelector = createSelector(
    [
        (state: RootState) => state.tracker.requiredDungeons,
        settingSelector('required-dungeon-count'),
    ],
    (selectedRequiredDungeons, numRequiredDungeons) => {
        if (numRequiredDungeons === 6) {
            return dungeonNames.filter((n) => n !== 'Sky Keep');
        } else {
            return selectedRequiredDungeons.slice();
        }
    },
);

export const checkImplicationsSelector = createSelector(
    [logicSelector, requiredDungeonsSelector, checkedChecksSelector],
    mapChecks,
);

function mapChecks(
    logic: Logic,
    requiredDungeons: string[],
    checkedChecks: string[],
) {
    const implications: { [bitIndex: number]: LogicalExpression } = {};
    const b = new LogicBuilder(logic.bitLogic, logic.allItems, implications);

    const validRequiredDungeons = requiredDungeons.filter(
        (d) => d in dungeonCompletionRequirements,
    );

    // If this is a goddess cube check, mark the requirement as checked
    // since this is the requirement used by the goddess chests.
    for (const check of checkedChecks) {
        if (cubeCheckToCanAccessCube[check]) {
            if (logic.checks[check]) {
                b.set(check, b.true());
            } else {
                console.error('unknown check', check)
            }
        }
    }

    const requiredDungeonsCompleted =
        validRequiredDungeons.length > 0 &&
        validRequiredDungeons.every((d) =>
            checkedChecks.includes(
                dungeonCompletionRequirements[d as RegularDungeon],
            ),
        );

    b.set(
        requiredDungeonsCompletedFakeRequirement,
        requiredDungeonsCompleted ? b.true() : b.false(),
    );

    return implications;
}

export const inLogicBitsSelector = createSelector(
    [
        logicSelector,
        settingsImplicationsSelector,
        inventoryImplicationsSelector,
        checkImplicationsSelector,
    ],
    (logic, settingsImplications, inventoryImplications, checkImplications) =>
        interpretLogic(logic.bitLogic, [
            settingsImplications,
            inventoryImplications,
            checkImplications,
        ]),
);

export const inSemiLogicBitsSelector = createSelector(
    [
        logicSelector,
        settingsImplicationsSelector,
        inventoryImplicationsSelector,
        inLogicBitsSelector,
        checkedChecksSelector,
        requiredDungeonsSelector,
    ],
    (
        logic,
        settingsImplications,
        inventoryImplications,
        inLogicBits,
        checkedChecks,
        requiredDungeons,
    ) => {
        // The assumed number of loose gratitude crystals is the number of
        // loose crystal checks that are either checked or are in logic.
        const numLooseGratitudeCrystals = Object.entries(logic.checks).filter(
            ([checkId, checkDef]) =>
                checkDef.type === 'loose_crystal' &&
                (inLogicBits.test(logic.itemBits[checkId]) ||
                    checkedChecks.includes(checkId)),
        ).length;

        const gratitudeImplications = mapInventory(logic, {
            'Gratitude Crystal': numLooseGratitudeCrystals,
        });
        const assumedInventory = {
            ...inventoryImplications,
            ...gratitudeImplications,
        };

        const assumedCheckedChecks = [...checkedChecks];

        for (const [canAccessItem, cubeItem] of Object.entries(
            canAccessCubeToCubeCheck,
        )) {
            if (inLogicBits.test(logic.itemBits[canAccessItem])) {
                assumedCheckedChecks.push(cubeItem);
            }
        }

        const assumedCheckImplications = mapChecks(
            logic,
            requiredDungeons,
            assumedCheckedChecks,
        );

        return interpretLogic(
            logic.bitLogic,
            [settingsImplications, assumedInventory, assumedCheckImplications],
            // Monotonicity of these requirements allows reusing inLogicBits
            inLogicBits,
        );
    },
);

export const dungeonCompletedSelector = currySelector(
    createSelector(
        [(_state: RootState, name: DungeonName) => name, checkedChecksSelector],
        (name, checkedChecks) =>
            name !== 'Sky Keep' &&
            checkedChecks.includes(dungeonCompletionRequirements[name]),
    ),
);

export const checkSelector = currySelector(
    createSelector(
        [
            (_state: RootState, checkId: string) => checkId,
            logicSelector,
            inLogicBitsSelector,
            inSemiLogicBitsSelector,
            checkedChecksSelector,
            mappedExitsSelector,
        ],
        (
            checkId,
            logic,
            inLogicBits,
            inSemiLogicBits,
            checkedChecks,
            mappedExits,
        ): Check => {
            const logicalCheckId = cubeCheckToCanAccessCube[checkId] ?? checkId;

            const checkBit = logic.itemBits[logicalCheckId];
            const logicalState = inLogicBits.test(checkBit)
                ? 'inLogic'
                : inSemiLogicBits.test(checkBit)
                    ? 'semiLogic'
                    : 'outLogic';

            if (logic.checks[checkId]) {
                const checkName = logic.checks[checkId].name;
                const shortCheckName = checkName.includes('-')
                    ? checkName.substring(checkName.indexOf('-') + 1).trim()
                    : checkName;
                return {
                    checked: checkedChecks.includes(checkId),
                    checkId,
                    checkName: shortCheckName,
                    type: logic.checks[checkId].type,
                    logicalState,
                };
            } else if (logic.areaGraph.exits[checkId]) {
                const shortCheckName = logic.areaGraph.exits[checkId].short_name;
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
    [areaNonprogressSelector, settingSelector('randomize-entrances'), settingSelector('randomize-dungeon-entrances')],
    (areaNonprogress, randomEntranceSetting, randomDungeonEntranceSetting) => {
        const dungeonEntranceSetting = randomDungeonEntranceSetting ?? randomEntranceSetting;
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
        settingSelector('excluded-locations'),
        settingSelector('rupeesanity'),
        settingSelector('shopsanity'),
        settingSelector('tadtonesanity'),
        settingSelector('treasuresanity-in-silent-realms'),
        settingSelector('trial-treasure-amount'),
    ],
    (
        logic,
        bannedLocations,
        rupeeSanity,
        shopSanity,
        tadtoneSanity,
        silentRealmTreasuresanity,
        silentRealmTreasureAmount,
    ) => {
        const bannedChecks = new Set(bannedLocations);
        const rupeesExcluded =
            rupeeSanity === 'Vanilla' || rupeeSanity === false;
        const maxRelics = silentRealmTreasuresanity
            ? silentRealmTreasureAmount
            : 0;
        const banBeedle = shopSanity === 'Vanilla' || shopSanity === false;

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

        return (checkId: string, check: LogicalCheck) =>
            // Loose crystal checks can be banned to not require picking them up
            // in logic, but we want to allow marking them as collected, since
            // this is semilogic?
            (check.type !== 'loose_crystal' && bannedChecks.has(check.name)) ||
            isExcessRelic(check) ||
            isBannedCubeCheckViaChest(checkId, check) ||
            (rupeesExcluded && check.type === 'rupee') ||
            (banBeedle && check.type === 'beedle_shop') ||
            (!tadtoneSanity && check.type === 'tadtone');
    },
);

export const areasSelector = createSelector(
    [
        logicSelector,
        checkedChecksSelector,
        isCheckBannedSelector,
        inLogicBitsSelector,
        areaNonprogressSelector,
        areaHiddenSelector,
        exitRulesSelector,
    ],
    (
        logic,
        checkedChecks,
        isCheckBanned,
        inLogicBits,
        isAreaNonprogress,
        isAreaHidden,
        exitRules,
    ): Area[] =>
        _.compact(
            logic.areas.map((area): Area | undefined => {
                const checks = logic.checksByArea[area];
                const progressChecks = checks.filter(
                    (check) => !isCheckBanned(check, logic.checks[check]),
                );

                if (!progressChecks.length) {
                    return undefined;
                }

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
                    (check) => !checkedChecks.includes(check),
                );
                const inLogic = remaining.filter((check) =>
                    inLogicBits.test(logic.itemBits[check]),
                );

                const exits = logic.exitsByArea[area].filter((exit) => exitRules[exit]?.type === 'random');

                return {
                    checks: regularChecks,
                    exits,
                    numTotalChecks: regularChecks.length,
                    extraChecks: _.groupBy(extraChecks, (check) => logic.checks[check].type),
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

export const remainingEntrancesSelector = createSelector(
    [logicSelector, exitRulesSelector, exitsSelector, settingSelector('randomize-entrances')],
    (logic, exitRules, exits, randomizeEntrances) => {
        // Some entrances can be double mapped with ER?
        const usedEntrances =
            randomizeEntrances !== 'All'
                ? new Set(
                    _.compact(
                        exits.map((exit) =>
                            exit.exit.id !== '\\Start'
                                ? exit.entrance?.id
                                : undefined,
                        ),
                    ),
                )
                : new Set();
        for (const [exitId, rule] of Object.entries(exitRules)) {
            if (rule.type === 'linked') {
                const pool = logic.areaGraph.entrancePools[rule.pool];
                const entry = Object.values(pool).find(
                    (linkage) => linkage.exits[1] === exitId,
                );
                if (entry) {
                    usedEntrances.add(entry.entrances[1]);
                }
            }
        }
        usedEntrances.add(logic.areaGraph.vanillaConnections['\\Start']);
        return Object.entries(logic.areaGraph.entrances)
            .filter(
                (e) =>
                    !usedEntrances.has(e[0]) &&
                    !bannedExitsAndEntrances.includes(e[0]) &&
                    !nonRandomizedExits.includes(
                        logic.areaGraph.vanillaConnections[e[0]],
                    ),
            )
            .map(([id, def]) => ({
                id,
                name: def.short_name,
            }));
    },
);
