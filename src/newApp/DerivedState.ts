import { Logic, LogicalCheck } from '../logic/Logic';
import { BitVector } from '../bitlogic/BitVector';

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
