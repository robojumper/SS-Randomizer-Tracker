import { keyBy } from 'es-toolkit';
import type { InventoryItem } from '../Inventory';
import type { ExitMapping } from '../Locations';
import { TimeOfDay, type TTimeOfDay } from '../Mappers';
import type { Area2 } from './Area';
import type { EventAccess2, LocationAccess2 } from './Location';
import type { Logic2 } from './Logic';
import type { Requirement2 } from './Requirement';

export interface SearchState2 {
    allowTricks: boolean;
    inventory: Record<InventoryItem, number>;
    reachableChecks: Set<string>;
    reachableExits: Set<string>;
    events: Set<string>;
    auxItems: Record<string, number>;
    // TODO: transient state to speed up semilogic?
}

export function cloneSearchState(state: SearchState2): SearchState2 {
    return {
        allowTricks: state.allowTricks,
        inventory: { ...state.inventory },
        events: new Set(state.events),
        reachableChecks: new Set(state.reachableChecks),
        reachableExits: new Set(state.reachableExits),
        auxItems: { ...state.auxItems },
    };
}

export function getInitialSearchState(
    inventory: Record<InventoryItem, number>,
    auxItems: Record<string, number>,
): SearchState2 {
    return {
        allowTricks: false,
        inventory,
        events: new Set(),
        reachableChecks: new Set(),
        reachableExits: new Set(['\\Start']),
        auxItems,
    };
}

/**
 * Unifying map exits and logical exits for purposes of search
 */
interface UnifiedExit2 {
    type: 'mapExit' | 'logicalExit';
    parentArea: Area2;
    connectedArea: Area2;
    requirement: Requirement2;
    validTod: TTimeOfDay[keyof TTimeOfDay];
}

export function search(
    logic: Logic2<Requirement2>,
    exitsMappings: ExitMapping[],
    initialState: SearchState2,
): SearchState2 {
    const areaAtTod: Record<string, TTimeOfDay[keyof TTimeOfDay] | 0> = {};
    let newThingsFound = true;

    for (const area of Object.keys(logic.areas)) {
        areaAtTod[area] = 0;
    }

    const connections = keyBy(exitsMappings, (mapping) => mapping.exit.id);

    let eventsToTry = new Set<EventAccess2>();
    const locationsToTryLast = new Set<LocationAccess2>();

    const mapExits: Record<string, UnifiedExit2 | undefined> = {};
    for (const [exitId, exit] of Object.entries(logic.exits)) {
        const connectedEntranceId = connections[exitId].entrance?.id;
        if (connectedEntranceId) {
            const entrance = logic.entrances[connectedEntranceId];
            const sourceArea = logic.areas[exit.parentArea];
            const destArea = logic.areas[entrance.parentArea];
            const validTod = (exit.allowedTimeOfDay &
                entrance.allowedTimeOfDay &
                sourceArea.allowedTimeOfDay &
                destArea.allowedTimeOfDay) as TTimeOfDay[keyof TTimeOfDay];
            mapExits[exitId] = {
                connectedArea: destArea,
                parentArea: sourceArea,
                requirement: logic.requirements[exit.requirementsIdx],
                type: 'mapExit',
                validTod,
            };
        }
    }
    let exitsToTry = new Set<UnifiedExit2>([mapExits['\\Start']!]);

    const newState = cloneSearchState(initialState);

    function visitAreaForTheFirstTime(
        area: Area2,
        tod: TTimeOfDay['DayOnly'] | TTimeOfDay['NightOnly'],
    ) {
        for (const exit of area.exits) {
            const exitObj = mapExits[exit.id];
            if (exitObj) {
                exitsToTry.add(exitObj);
            }
        }

        for (const exit of area.logicalExits) {
            const destArea = logic.areas[exit.connectedArea];

            exitsToTry.add({
                type: 'logicalExit',
                connectedArea: destArea,
                parentArea: area,
                requirement: logic.requirements[exit.requirementsIdx],
                validTod: (area.allowedTimeOfDay &
                    destArea.allowedTimeOfDay) as TTimeOfDay[keyof TTimeOfDay],
            });
        }
        for (const event of area.events) {
            eventsToTry.add(event);
        }
        for (const location of area.locations) {
            locationsToTryLast.add(location);
        }
        areaAtTod[area.id] = tod;
        newThingsFound = true;
    }

    function tryEvents() {
        const nextEventsToTry = new Set<EventAccess2>();
        for (const event of eventsToTry) {
            const parentArea = event.parentArea;
            if (
                !newState.events.has(event.eventId) &&
                areaAtTod[parentArea] !== 0 &&
                evaluateRequirement(
                    newState,
                    logic.requirements[event.requirementsIdx],
                    areaAtTod[parentArea],
                )
            ) {
                newState.events.add(event.eventId);
                newThingsFound = true;
            } else {
                nextEventsToTry.add(event);
            }
        }
        eventsToTry = nextEventsToTry;
    }

    function tryExit(exit: UnifiedExit2) {
        for (const tod of [TimeOfDay.DayOnly, TimeOfDay.NightOnly]) {
            // ssrando effectively has a bug here where passing the exit requirement
            // at a specific ToD only still allows the opposite ToD to logically
            // pass through.
            if (
                // We haven't reached the area yet at the given time of day
                (areaAtTod[exit.connectedArea.id] & tod) === 0 &&
                // Can reach parent area at time of day
                (areaAtTod[exit.parentArea.id] & tod) !== 0 &&
                // The given time of day is valid for all involved areas, exit, and entrance
                (exit.validTod & tod) !== 0
            ) {
                if (evaluateRequirement(newState, exit.requirement, tod)) {
                    if (areaAtTod[exit.connectedArea.id] === 0) {
                        visitAreaForTheFirstTime(exit.connectedArea, tod);
                    }
                }
            }
        }

        return (
            areaAtTod[exit.connectedArea.id] ===
            exit.connectedArea.allowedTimeOfDay
        );
    }

    function tryExits() {
        const nextExitsToTry = new Set<UnifiedExit2>();
        for (const exit of exitsToTry) {
            if (
                (areaAtTod[exit.connectedArea.id] &
                    exit.connectedArea.allowedTimeOfDay) !==
                exit.connectedArea.allowedTimeOfDay
            ) {
                if (!tryExit(exit)) {
                    nextExitsToTry.add(exit);
                }
            }
        }
        exitsToTry = nextExitsToTry;
    }

    while (newThingsFound) {
        newThingsFound = false;
        tryExits();
        tryEvents();
    }

    for (const location of locationsToTryLast) {
        const parentArea = location.parentArea;
        if (
            !newState.reachableChecks.has(location.locationId) &&
            areaAtTod[parentArea] !== 0 &&
            evaluateRequirement(
                newState,
                logic.requirements[location.requirementsIdx],
                areaAtTod[parentArea],
            )
        ) {
            newState.reachableChecks.add(location.locationId);
        }
    }

    return newState;
}

const walletCapacities = [300, 500, 1000, 5000, 9000];

function evaluateRequirement(
    state: SearchState2,
    requirement: Requirement2,
    timeOfDay: TTimeOfDay[keyof TTimeOfDay],
): boolean {
    switch (requirement.type) {
        case 'and':
            return requirement.terms.every((t) =>
                evaluateRequirement(state, t, timeOfDay),
            );
        case 'or':
            return requirement.terms.some((t) =>
                evaluateRequirement(state, t, timeOfDay),
            );
        case 'item':
            return state.inventory[requirement.name] >= requirement.count;
        case 'event':
            return state.events.has(requirement.id);
        case 'timeOfDay':
            return (timeOfDay & requirement.tod) !== 0;
        case 'rupeeCapacity':
            return (
                walletCapacities[state.inventory['Progressive Wallet']] +
                    300 * state.inventory['Extra Wallet'] >=
                requirement.amount
            );
        case 'gratitudeCrystals':
            return (
                state.inventory['Gratitude Crystal Pack'] * 5 +
                    (state.auxItems['Gratitude Crystal'] ?? 0) >=
                requirement.amount
            );
        case 'auxItem':
            return (state.auxItems[requirement.name] ?? 0) > 0;
        case 'trick':
            return state.allowTricks;
    }
}
