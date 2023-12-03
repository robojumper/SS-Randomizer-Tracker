import { useMemo } from 'react';
import { Logic, LogicalCheck } from '../logic/Logic';
import { mapState } from './State';
import {
    nonRandomizedExits,
    randomizedExitsToDungeons,
} from './ThingsThatWouldBeNiceToHaveInTheDump';
import { OptionDefs } from '../permalink/SettingsTypes';
import { produce } from 'immer';
import { BitVector } from '../logic/BitVector';
import { TrackerState } from '../tracker/slice';

export interface DerivedState {
    logic: Logic;
    inventoryBits: BitVector;
}

export interface Area<N extends string = string> {
    name: N;
    nonProgress: boolean;
    numTotalChecks: number;
    numChecksRemaining: number;
    numChecksAccessible: number;
    checks: string[];
    extraChecks: string[];
}

export type LogicalState = 'outLogic' | 'inLogic' | 'semiLogic';

export interface Check {
    type: LogicalCheck['type'] | 'exit';
    checkId: string;
    checkName: string;
    logicalState: LogicalState;
    checked: boolean;
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
export function isDungeon(id: string): id is DungeonName {
    const names: readonly string[] = dungeonNames;
    return names.includes(id);
}

export function useComputeDerivedState(
    logic: Logic,
    options: OptionDefs,
    state: TrackerState,
): DerivedState {
    const entranceRandomSetting = state.settings!['randomize-entrances'];
    const startingEntranceSetting = state.settings!['random-start-entrance'];
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

    const { items: stateItems } = useMemo(() => mapState(
        logic,
        options,
        state.inventory,
        state.checkedChecks,
        state.mappedExits,
        activeVanillaConnections,
        state.requiredDungeons,
        state.settings!,
    ), [activeVanillaConnections, logic, options, state.checkedChecks, state.inventory, state.mappedExits, state.requiredDungeons, state.settings]);

    return {
        logic,
        inventoryBits: stateItems,
    };
}
