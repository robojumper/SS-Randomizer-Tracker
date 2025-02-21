import type { TTimeOfDay } from '../Mappers';
import type { Exit2 } from './Entrance';
import type { EventAccess2, LocationAccess2 } from './Location';

/** Simply connects regions */
export interface LogicalExit2 {
    parentArea: string;
    connectedArea: string;
    requirementsIdx: number;
}

export interface Area2 {
    id: string;
    subAreas: Record<string, Area2>;
    abstract: boolean;
    allowedTimeOfDay: TTimeOfDay[keyof TTimeOfDay];
    canSleep: boolean;
    /** The possible ways to get into this area, an entry in Logic.entrances */
    entrances: string[];
    /** Map exits */
    exits: Exit2[];
    /** Logical exits */
    logicalExits: LogicalExit2[];
    /** Location access */
    locations: LocationAccess2[];
    /** Event access */
    events: EventAccess2[];
}
