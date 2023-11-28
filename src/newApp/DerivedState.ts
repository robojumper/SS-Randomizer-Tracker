import { useMemo } from 'react';
import { Logic } from './NewLogic';
import { Hint, Items, State, mapInventory, mapState } from './State';
import { interpretLogic } from './LogicInterpretation';
import _ from 'lodash';
import {
    dungeonCompletionRequirements,
    nonRandomizedExits,
    randomizedExitsToDungeons,
} from './ThingsThatWouldBeNiceToHaveInTheDump';
import { OptionDefs, TypedOptions2 } from '../permalink/SettingsTypes';

export interface DerivedState {
    regularAreas: Area[];
    dungeons: Area<Dungeon>[];
    silentRealms: Area[];
    areas: Record<string, Area>;
    itemCount: Partial<Record<Items | 'Total Gratitude Crystals', number>>;
    exits: ExitMapping[];
    remainingEntrances: { id: string; name: string }[];
    completedDungeons: string[];
    numChecked: number;
    numAccessible: number;
    numRemaining: number;
}

export interface Area<N extends string = string> {
    name: N;
    numChecksRemaining: number;
    numChecksAccessible: number;
    numTotalChecks: number;
    checks: Check[];
    secondaryChecks: Check[];
    hint: Hint | undefined;
}

export type LogicalState = 'outLogic' | 'inLogic' | 'semiLogic';

export interface Check {
    type: 'regular' | 'exit' | 'cube' | 'loose_crystal';
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

export type Dungeon = (typeof dungeonNames)[number];
export type RegularDungeon = Exclude<Dungeon, 'Sky Keep'>;
function isDungeon(id: string): id is Dungeon {
    const names: readonly string[] = dungeonNames;
    return names.includes(id);
}

const trialTreasurePattern = /Relic (\d+)/;

function createIsCheckBannedPredicate(settings: TypedOptions2) {
    const bannedChecks = new Set(settings['excluded-locations']);
    const rupeesExcluded =
        settings['rupeesanity'] === 'Vanilla' ||
        settings['rupeesanity'] === false;
    const maxRelics = settings['treasuresanity-in-silent-realms'] ? settings['trial-treasure-amount'] : 0;

    // FIXME this check `type` data is there but not in the dump

    const isExcessRelic = (checkName: string) => {
        const match = checkName.match(trialTreasurePattern);
        return match && parseInt(match[1], 10) > maxRelics;
    }

    return (checkName: string) =>
        bannedChecks.has(checkName) ||
        isExcessRelic(checkName) ||
        (rupeesExcluded && checkName.includes('Rupee'));
}

export function useComputeDerivedState(
    logic: Logic,
    options: OptionDefs,
    state: State,
): DerivedState {
    const start = performance.now();

    const entranceRandomSetting = state.settings['randomize-entrances'];
    const activeVanillaConnections = useMemo(() => {
        if (entranceRandomSetting === 'None') {
            return logic.areaGraph.vanillaConnections;
        } else {
            return Object.fromEntries(
                Object.entries(logic.areaGraph.vanillaConnections).filter(
                    ([from]) =>
                        !randomizedExitsToDungeons.includes(from) &&
                        !nonRandomizedExits.includes(from),
                ),
            );
        }
    }, [entranceRandomSetting, logic]);

    const resultBits = useMemo(() => {
        const { items, implications } = mapState(
            logic,
            options,
            state.inventory,
            state.checkedChecks,
            state.mappedExits,
            activeVanillaConnections,
            state.settings,
        );
        return interpretLogic(logic, items, implications);
    }, [activeVanillaConnections, logic, options, state.checkedChecks, state.inventory, state.mappedExits, state.settings]);

    const semiLogicResultBits = useMemo(() => {
        const assumedCheckedChecks = [...state.checkedChecks];
        for (const looseCrystal of logic.looseCrystalChecks) {
            if (!assumedCheckedChecks.includes(looseCrystal)) {
                const bit = logic.items[looseCrystal][1];
                if (resultBits.test(bit)) {
                    assumedCheckedChecks.push(looseCrystal);
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
            state.settings,
        );
        return interpretLogic(logic, items, implications);
    }, [activeVanillaConnections, logic, options, resultBits, state.checkedChecks, state.inventory, state.mappedExits, state.settings]);

    const isCheckBanned = useMemo(
        () => createIsCheckBannedPredicate(state.settings),
        [state.settings],
    );

    const areas: Area[] = useMemo(() => {
        const list = Object.entries(logic.checksByArea);
        return list.map(([regionName, checksList]) => {
            const progressChecks = checksList.filter(
                (check) => !isCheckBanned(logic.checks[check]),
            );
            const checkObjs: Check[] = progressChecks.map((checkId) => {
                const idx = logic.items[checkId][1];
                const inLogic = resultBits.test(idx);
                const inSemilogic = !inLogic && semiLogicResultBits.test(idx);
                const checked = state.checkedChecks.includes(checkId);
                const checkName = logic.checks[checkId];

                const shortCheckName = checkName.includes('-')
                    ? checkName.substring(checkName.indexOf('-') + 1).trim()
                    : checkName;
                const isCrystal = logic.looseCrystalChecks.includes(checkId);

                return {
                    type: isCrystal ? 'loose_crystal' : 'regular',
                    checkId,
                    logicalState: inLogic ? 'inLogic' : inSemilogic ? 'semiLogic' : 'outLogic',
                    checked,
                    checkName: shortCheckName,
                    hintItem: state.checkHints[checkId],
                };
            });

            const [regularChecks, secondaryChecks] = _.partition(
                checkObjs,
                (check) => check.type === 'regular',
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
                secondaryChecks,
                hint: state.hints[regionName],
            } satisfies Area;
        });
    }, [isCheckBanned, logic, resultBits, semiLogicResultBits, state.checkHints, state.checkedChecks, state.hints]);

    const [regularAreas, silentRealms, dungeons] = useMemo(() => {
        const [silentRealms, areasAndDungeons] = _.partition(areas, (a) =>
            a.name.includes('Silent Realm'),
        );
        const [dungeons, regularAreas] = _.partition(areasAndDungeons, (a) =>
            isDungeon(a.name),
        );
        const sortedDungeons = _.sortBy(dungeons as Area<Dungeon>[], (d) =>
            dungeonNames.indexOf(d.name),
        );

        return [regularAreas, silentRealms, sortedDungeons];
    }, [areas]);

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
            _.compact(exits.map((exit) => exit.entrance?.id)),
        );
        return Object.entries(logic.areaGraph.entrances)
            .filter((e) => !usedEntrances.has(e[0]))
            .map(([id, def]) => ({
                id,
                name: def.short_name,
            }));
    }, [exits, logic]);

    console.log('state derivation took:', performance.now() - start, 'ms');

    return {
        regularAreas,
        dungeons,
        silentRealms,
        areas: _.keyBy(areas, (a) => a.name),
        exits,
        remainingEntrances,
        completedDungeons,
        itemCount,
        numChecked,
        numAccessible,
        numRemaining,
    };
}
