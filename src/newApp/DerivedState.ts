import { useMemo } from 'react';
import { Logic, LogicalCheck } from '../logic/Logic';
import { Hint, Items, State, mapInventory, mapState } from './State';
import { interpretLogic } from '../logic/LogicInterpretation';
import _ from 'lodash';
import {
    dungeonCompletionRequirements,
    nonRandomizedExits,
    randomizedExitsToDungeons,
} from './ThingsThatWouldBeNiceToHaveInTheDump';
import { OptionDefs, TypedOptions } from '../permalink/SettingsTypes';
import {
    cubeCheckToCanAccessCube,
    cubeCheckToGoddessChestCheck,
    mapToCanAccessCubeRequirement,
} from './TrackerModifications';
import { produce } from 'immer';
import { BitVector } from '../logic/BitVector';

export interface DerivedState {
    regularAreas: Area[];
    dungeons: Dungeon[];
    silentRealms: Area[];
    areas: Record<string, Area>;
    itemCount: Partial<Record<Items | 'Total Gratitude Crystals', number>>;
    exits: ExitMapping[];
    remainingEntrances: { id: string; name: string }[];
    allowedStartingEntrances: { id: string; name: string }[];
    completedDungeons: string[];
    numChecked: number;
    numAccessible: number;
    numRemaining: number;

    logic: Logic;
    inventoryBits: BitVector;
}

export interface Area<N extends string = string> {
    name: N;
    numChecksRemaining: number;
    numChecksAccessible: number;
    numTotalChecks: number;
    checks: Check[];
    extraChecks: Check[];
    hint: Hint | undefined;
}

export interface Dungeon extends Area<DungeonName> {
    required: boolean;
    completed: boolean;
}

export type LogicalState = 'outLogic' | 'inLogic' | 'semiLogic';

export interface Check {
    type: LogicalCheck['type'] | 'exit';
    checkId: string;
    checkName: string;
    logicalState: LogicalState;
    checked: boolean;
    hintItem: string | undefined;
}

export interface ExitMapping {
    exit: {
        id: string;
        name: string;
    };
    entrance:
        | {
              id: string;
              name: string;
          }
        | undefined;
    canAssign: boolean;
    inLogic: boolean;
}

const dungeonNames = [
    'Skyview',
    'Earth Temple',
    'Lanayru Mining Facility',
    'Ancient Cistern',
    'Sandship',
    'Fire Sanctuary',
    'Sky Keep',
] as const;

export type DungeonName = (typeof dungeonNames)[number];
export type RegularDungeon = Exclude<DungeonName, 'Sky Keep'>;
function isDungeon(id: string): id is DungeonName {
    const names: readonly string[] = dungeonNames;
    return names.includes(id);
}

const trialTreasurePattern = /Relic (\d+)/;

function createIsCheckBannedPredicate(logic: Logic, settings: TypedOptions) {
    const bannedChecks = new Set(settings['excluded-locations']);
    const rupeesExcluded =
        settings['rupeesanity'] === 'Vanilla' ||
        settings['rupeesanity'] === false;
    const maxRelics = settings['treasuresanity-in-silent-realms']
        ? settings['trial-treasure-amount']
        : 0;
    const banBeedle =
        settings['shopsanity'] === 'Vanilla' ||
        settings['shopsanity'] === false;

    const isExcessRelic = (check: LogicalCheck) => {
        if (check.type === 'trial_treasure') {
            const match = check.name.match(trialTreasurePattern);
            return match && parseInt(match[1], 10) > maxRelics;
        }
    };

    const banTadtones = !settings['tadtonesanity'];

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
        bannedChecks.has(check.name) ||
        isExcessRelic(check) ||
        isBannedCubeCheckViaChest(checkId, check) ||
        (rupeesExcluded && check.type === 'rupee') ||
        (banBeedle && check.type === 'beedle_shop') ||
        (banTadtones && check.type === 'tadtone');
}

function skyKeepNonprogress(settings: TypedOptions) {
    return (
        settings['empty-unrequired-dungeons'] === true &&
        (settings['triforce-required'] === false ||
            settings['triforce-shuffle'] === 'Anywhere')
    );
}

function isAreaNonprogress(settings: TypedOptions, area: string) {
    return area === 'Sky Keep' && skyKeepNonprogress(settings);
}

export function useComputeDerivedState(
    logic: Logic,
    options: OptionDefs,
    state: State,
): DerivedState {
    const start = performance.now();

    const entranceRandomSetting = state.settings['randomize-entrances'];
    const startingEntranceSetting = state.settings['random-start-entrance'];
    const activeVanillaConnections = useMemo(() => {
        let connections: Record<string, string>;
        if (entranceRandomSetting === 'None') {
            connections = logic.areaGraph.vanillaConnections;
        } else {
            connections = Object.fromEntries(
                Object.entries(logic.areaGraph.vanillaConnections).filter(
                    ([from]) =>
                        !randomizedExitsToDungeons.includes(from) &&
                        !nonRandomizedExits.includes(from),
                ),
            );
        }

        if (startingEntranceSetting !== 'Vanilla') {
            connections = produce(connections, (draft) => {
                delete draft['\\Start'];
            });
        }

        return connections;
    }, [
        entranceRandomSetting,
        logic.areaGraph.vanillaConnections,
        startingEntranceSetting,
    ]);

    const { items: stateItems, implications: stateImplications } = useMemo(() => mapState(
        logic,
        options,
        state.inventory,
        state.checkedChecks,
        state.mappedExits,
        activeVanillaConnections,
        state.requiredDungeons,
        state.settings,
    ), [activeVanillaConnections, logic, options, state.checkedChecks, state.inventory, state.mappedExits, state.requiredDungeons, state.settings]);

    const resultBits = useMemo(() => {
        return interpretLogic(logic, stateItems, stateImplications);
    }, [logic, stateImplications, stateItems]);

    const maybeCubeName = (check: string) =>
        check in cubeCheckToGoddessChestCheck
            ? mapToCanAccessCubeRequirement(check)
            : check;

    const semiLogicResultBits = useMemo(() => {
        const assumedCheckedChecks = [...state.checkedChecks];
        for (const [checkId, check] of Object.entries(logic.checks)) {
            if (check.type === 'loose_crystal') {
                const bit = logic.items[checkId][1];
                if (resultBits.test(bit)) {
                    assumedCheckedChecks.push(checkId);
                }
            }
            if (check.type === 'tr_cube') {
                const bit = logic.items[cubeCheckToCanAccessCube[checkId]][1];
                if (resultBits.test(bit)) {
                    assumedCheckedChecks.push(checkId);
                }
            }
        }

        const { items, implications } = mapState(
            logic,
            options,
            state.inventory,
            assumedCheckedChecks,
            state.mappedExits,
            activeVanillaConnections,
            state.requiredDungeons,
            state.settings,
        );
        // Monotonicity means we can optimize with this or
        return interpretLogic(logic, items.or(resultBits), implications);
    }, [
        activeVanillaConnections,
        logic,
        options,
        resultBits,
        state.checkedChecks,
        state.inventory,
        state.mappedExits,
        state.requiredDungeons,
        state.settings,
    ]);

    const isCheckBanned = useMemo(
        () => createIsCheckBannedPredicate(logic, state.settings),
        [logic, state.settings],
    );

    const areas: Area[] = useMemo(() => {
        const list = Object.entries(logic.checksByArea).filter(
            ([area]) => !isAreaNonprogress(state.settings, area),
        );
        let areasList = list.map(([regionName, checksList]) => {
            const progressChecks = checksList.filter(
                (check) => !isCheckBanned(check, logic.checks[check]),
            );
            const checkObjs: Check[] = progressChecks.map((checkId) => {
                const idx = logic.items[checkId][1];
                const inLogicIdx = logic.items[maybeCubeName(checkId)][1];
                const inLogic = resultBits.test(inLogicIdx);
                const inSemilogic = !inLogic && semiLogicResultBits.test(idx);
                const checked = state.checkedChecks.includes(checkId);
                const checkName = logic.checks[checkId].name;

                const shortCheckName = checkName.includes('-')
                    ? checkName.substring(checkName.indexOf('-') + 1).trim()
                    : checkName;

                return {
                    type: logic.checks[checkId].type,
                    checkId,
                    logicalState: inLogic
                        ? 'inLogic'
                        : inSemilogic
                            ? 'semiLogic'
                            : 'outLogic',
                    checked,
                    checkName: shortCheckName,
                    hintItem: state.checkHints[checkId],
                };
            });

            const [extraChecks, regularChecks] = _.partition(
                checkObjs,
                (check) =>
                    check.type === 'tr_cube' || check.type === 'loose_crystal',
            );

            const remaining = regularChecks.filter((check) => !check.checked);
            const numChecksRemaining = remaining.length;
            const numChecksAccessible = remaining.filter(
                (check) => check.logicalState === 'inLogic',
            ).length;

            return {
                name: regionName,
                numChecksRemaining,
                numChecksAccessible,
                numTotalChecks: regularChecks.length,
                checks: regularChecks,
                extraChecks,
                hint: state.hints[regionName],
            } satisfies Area;
        });

        const rawCheckOrder = Object.entries(logic.checks)
            .filter(([, check]) => check.type !== 'tr_cube')
            .map(([checkId]) => checkId);

        areasList = _.sortBy(areasList, (area) =>
            rawCheckOrder.indexOf(
                logic.checksByArea[area.name].find(
                    (check) => logic.checks[check].type !== 'tr_cube',
                )!,
            ),
        );

        for (const area of areasList) {
            area.checks = _.sortBy(area.checks, (check) => rawCheckOrder.indexOf(check.checkId));
        }

        return areasList;
    }, [
        isCheckBanned,
        logic,
        resultBits,
        semiLogicResultBits,
        state.checkHints,
        state.checkedChecks,
        state.hints,
        state.settings,
    ]);

    const [regularAreas, silentRealms, dungeons] = useMemo(() => {
        const [silentRealms, areasAndDungeons] = _.partition(areas, (a) =>
            a.name.includes('Silent Realm'),
        );
        const [dungeons, regularAreas] = _.partition(areasAndDungeons, (a) =>
            isDungeon(a.name),
        );
        const elaboratedDungeons: Dungeon[] = (
            dungeons as Area<DungeonName>[]
        ).map((dungeon) => ({
            ...dungeon,
            completed:
                dungeon.name !== 'Sky Keep' &&
                state.checkedChecks.includes(
                    dungeonCompletionRequirements[dungeon.name],
                ),
            required: state.requiredDungeons.includes(dungeon.name),
        }));
        const sortedDungeons = _.sortBy(elaboratedDungeons, (d) =>
            dungeonNames.indexOf(d.name),
        );

        return [regularAreas, silentRealms, sortedDungeons];
    }, [areas, state.checkedChecks, state.requiredDungeons]);

    const itemCount = useMemo(
        () => mapInventory(logic, state.inventory, state.checkedChecks),
        [state.inventory, state.checkedChecks, logic],
    );

    const numChecked = _.sumBy(
        areas,
        (a) => a.numTotalChecks - a.numChecksRemaining,
    );
    const numAccessible = _.sumBy(areas, (a) => a.numChecksAccessible);
    const numRemaining = _.sumBy(areas, (a) => a.numChecksRemaining);

    const completedDungeons = useMemo(() => {
        return Object.entries(dungeonCompletionRequirements)
            .filter(([, req]) => {
                return state.checkedChecks.includes(req);
            })
            .map(([name]) => name);
    }, [state.checkedChecks]);

    const exits: ExitMapping[] = useMemo(() => {
        const exits = Object.entries(logic.areaGraph.exits).map(
            ([exitId, exitDef]) => {
                const bit = logic.items[exitId][1];
                const inLogic = resultBits.test(bit);
                let entrance: string | undefined =
                    activeVanillaConnections[exitId];
                const canAssign = !entrance;
                entrance ??= state.mappedExits[exitId];

                const entranceObj = entrance
                    ? {
                        id: entrance,
                        name: logic.areaGraph.entrances[entrance].short_name,
                    }
                    : undefined;

                return {
                    exit: {
                        id: exitId,
                        name: exitDef.short_name,
                    },
                    entrance: entranceObj,
                    canAssign,
                    inLogic,
                } satisfies ExitMapping;
            },
        );

        return _.sortBy(
            exits,
            (exit) => !exit.canAssign,
            (exit) => Boolean(exit.entrance),
        );
    }, [activeVanillaConnections, logic, resultBits, state.mappedExits]);

    const remainingEntrances = useMemo(() => {
        const usedEntrances = new Set(
            _.compact(
                exits.map(
                    (exit) => exit.exit.id !== '\\Start' && exit.entrance?.id,
                ),
            ),
        );
        return Object.entries(logic.areaGraph.entrances)
            .filter((e) => !usedEntrances.has(e[0]))
            .map(([id, def]) => ({
                id,
                name: def.short_name,
            }));
    }, [exits, logic]);

    // TODO Filter based on setting
    const allowedStartingEntrances = useMemo(() => {
        return Object.entries(logic.areaGraph.entrances).map(([id, def]) => ({
            id,
            name: def.short_name,
        }));
    }, [logic]);

    console.log('state derivation took:', performance.now() - start, 'ms');

    return {
        regularAreas,
        dungeons,
        silentRealms,
        areas: _.keyBy(areas, (a) => a.name),
        exits,
        remainingEntrances,
        allowedStartingEntrances,
        completedDungeons,
        itemCount,
        numChecked,
        numAccessible,
        numRemaining,
        logic,
        inventoryBits: stateItems,
    };
}
