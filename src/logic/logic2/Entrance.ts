import { keyBy } from 'es-toolkit';
import type { ExitMapping } from '../Locations';
import type { TTimeOfDay } from '../Mappers';
import type { Area2 } from './Area';
import type { Logic2 } from './Logic';
import type { Requirement2 } from './Requirement';

export interface Exit2 {
    id: string;
    name: string;
    parentArea: string;
    requirementsIdx: number;
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

/**
 * Unifying map exits and logical exits for purposes of search
 */
export interface UnifiedExit2 {
    type: 'mapExit' | 'logicalExit';
    parentArea: Area2;
    connectedArea: Area2;
    requirement: Requirement2;
    validTod: TTimeOfDay[keyof TTimeOfDay];
    exitId: string | undefined;
}

interface Exits {
    /** Exit id -> connection */
    mapExits: Record<string, UnifiedExit2 | undefined>;
    /** area id -> connection[] */
    logicalExits: Record<string, UnifiedExit2[]>;
}

export function getSearchExits(
    logic: Pick<Logic2, 'exits' | 'areas' | 'entrances' | 'requirements'>,
    exitsMappings: ExitMapping[],
): Exits {
    const connections = keyBy(exitsMappings, (mapping) => mapping.exit.id);

    const mapExits: Record<string, UnifiedExit2 | undefined> = {};
    for (const [exitId, exit] of Object.entries(logic.exits)) {
        const connectedEntranceId = connections[exitId]?.entrance?.id;
        if (connectedEntranceId) {
            const entrance = logic.entrances[connectedEntranceId];
            const sourceArea = logic.areas[exit.parentArea];
            const destArea = logic.areas[entrance.parentArea];
            const validTod = (entrance.allowedTimeOfDay &
                sourceArea.allowedTimeOfDay &
                destArea.allowedTimeOfDay) as TTimeOfDay[keyof TTimeOfDay];
            mapExits[exitId] = {
                type: 'mapExit',
                connectedArea: destArea,
                parentArea: sourceArea,
                requirement: logic.requirements[exit.requirementsIdx],
                validTod,
                exitId,
            };
        }
    }

    const logicalExits: Record<string, UnifiedExit2[]> = {};

    for (const area of Object.values(logic.areas)) {
        logicalExits[area.id] = [];
        for (const exit of area.logicalExits) {
            const sourceArea = logic.areas[exit.parentArea];
            const destArea = logic.areas[exit.connectedArea];
            const validTod = (sourceArea.allowedTimeOfDay &
                destArea.allowedTimeOfDay) as TTimeOfDay[keyof TTimeOfDay];
            logicalExits[area.id].push({
                type: 'logicalExit',
                connectedArea: destArea,
                parentArea: sourceArea,
                requirement: logic.requirements[exit.requirementsIdx],
                validTod,
                exitId: undefined,
            });
        }
    }

    return { mapExits, logicalExits };
}
