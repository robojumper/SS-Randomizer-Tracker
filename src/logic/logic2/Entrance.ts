import type { TTimeOfDay } from '../Mappers';

export interface Exit2 {
    id: string;
    name: string;
    parentArea: string;
    requirementsIdx: number;
    allowedTimeOfDay: TTimeOfDay[keyof TTimeOfDay];
    /** Entrance ID of the vanilla connection */
    vanillaConnection: string | undefined;
    excludedFromFullEr: boolean;
}

export interface Entrance2 {
    id: string;
    name: string;
    province: string | undefined;
    parentArea: string;
    canStartAt: boolean;
    allowedTimeOfDay: TTimeOfDay[keyof TTimeOfDay];
    isBirdStatueEntrance: boolean;
    excludedFromFullEr: boolean;
}
