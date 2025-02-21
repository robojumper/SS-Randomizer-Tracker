import { BitVector } from '../../logic/bitlogic/BitVector';
import { LogicalExpression } from '../../logic/bitlogic/LogicalExpression';
import type { ExitMapping } from '../../logic/Locations';
import type { Area2 } from '../../logic/logic2/Area';
import { getSearchExits, type UnifiedExit2 } from '../../logic/logic2/Entrance';
import type {
    EventAccess2,
    LocationAccess2,
} from '../../logic/logic2/Location';
import type {
    RecursiveRequirement2,
    Requirement2,
} from '../../logic/logic2/Requirement';
import { TimeOfDay, type TTimeOfDay } from '../../logic/Mappers';
import { appDebug } from '../../utils/Debug';
import { dnfToRequirementExpr } from './Algorithms';
import {
    createBitIndex,
    getRequirementBit,
    type BitIndex,
    type RecursiveTooltipRequirement2,
} from './BitIndex';
import type { LeanLogic, WorkerRequest, WorkerResponse } from './Types';

/**
 * This module contains various strategies to turn the requirements into a more compact and readable
 * form, with the goal of creating readable and understandable requirements for tooltips.
 */

/**
 * Global application state. Will be initialized with the first message.
 */
interface GlobalState {
    logic: LeanLogic;
    exits: ExitMapping[];
    locationExitDnfs: Record<string, LogicalExpression>;
    bitIndex: BitIndex | undefined;
}

let g: GlobalState;

appDebug('Hello from worker!');

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
    const start = performance.now();
    switch (ev.data.type) {
        case 'initialize': {
            g = {
                logic: ev.data.logic,
                exits: ev.data.exits,
                locationExitDnfs: {},
                bitIndex: undefined,
            };

            const start2 = performance.now();
            bottomUpTooltipPropagation(g.logic, g.exits);
            appDebug(
                'worker',
                'fixpoint propagation took',
                performance.now() - start2,
                'ms',
            );

            break;
        }
        case 'analyze': {
            if (!g) {
                throw new Error('needs to be initialized first!!!!');
            }
            const expression = analyze(ev.data.checkId);
            appDebug(
                'worker',
                'total time for',
                ev.data.checkId,
                'was',
                performance.now() - start,
                'ms',
            );
            postMessage({
                checkId: ev.data.checkId,
                expression,
            } satisfies WorkerResponse);
        }
    }
};

function visitRequirement<R extends object>(
    req: RecursiveRequirement2<R>,
    handler: (req: RecursiveRequirement2<R>) => void,
) {
    handler(req);
    if ('type' in req) {
        switch (req.type) {
            case 'or':
            case 'and': {
                for (const term of req.terms) {
                    visitRequirement(term, handler);
                }
            }
        }
    }
}

export function intersects<T>(a: Set<T>, b: Set<T>): boolean {
    if (a.size > b.size) {
        const tmp = a;
        // eslint-disable-next-line no-param-reassign
        a = b;
        // eslint-disable-next-line no-param-reassign
        b = tmp;
    }
    return [...a].some((r) => b.has(r));
}

function bottomUpTooltipPropagation(
    logic: LeanLogic,
    exitsMappings: ExitMapping[],
) {
    const bitIndex = createBitIndex();
    const eventExprs: Record<string, LogicalExpression | undefined> = {};
    const areaTodExprs: Record<
        TTimeOfDay['DayOnly'] | TTimeOfDay['NightOnly'],
        Record<string, LogicalExpression | undefined>
    > = {
        [TimeOfDay.DayOnly]: {},
        [TimeOfDay.NightOnly]: {},
    };

    const exitsToTry = new Set<UnifiedExit2>();
    const eventsToTry = new Set<EventAccess2>();
    const areasToTry = new Set<Area2>();

    let recentlyUpdatedAreas = new Set<string>();
    let recentlyUpdatedEvents = new Set<string>();

    let newlyUpdatedAreas = new Set<string>();
    let newlyUpdatedEvents = new Set<string>();

    // exit|event access -> set<event id>
    const remoteRequirements = new Map<
        UnifiedExit2 | EventAccess2,
        Set<string> | undefined
    >();

    const { mapExits, logicalExits } = getSearchExits(logic, exitsMappings);
    const startMapping = mapExits['\\Start']!;
    exitsToTry.add(startMapping);
    for (const area of Object.values(logic.areas)) {
        if (area.abstract) {
            for (const event of area.events) {
                eventsToTry.add(event);
            }
        }
    }

    function visitor(thing: UnifiedExit2 | EventAccess2) {
        function handler(requirement: Requirement2) {
            if (requirement.type === 'event') {
                const map = remoteRequirements.get(thing);
                if (map) {
                    map.add(requirement.id);
                } else {
                    remoteRequirements.set(thing, new Set([requirement.id]));
                }
            }
        }
        return handler;
    }

    for (const area of Object.values(logic.areas)) {
        for (const exit of area.exits) {
            const conn = mapExits[exit.id];
            if (conn) {
                visitRequirement(
                    logic.requirements[exit.requirementsIdx],
                    visitor(conn),
                );
            }
        }
    }

    for (const conn of Object.values(logicalExits).flat()) {
        visitRequirement(conn.requirement, visitor(conn));
    }

    let newThingsFound = true;
    areaTodExprs[TimeOfDay.DayOnly][startMapping.parentArea.id] =
        LogicalExpression.true();
    newlyUpdatedAreas.add(startMapping.parentArea.id);

    function wasRecentlyUpdated(
        area: Area2,
        thing: UnifiedExit2 | EventAccess2,
    ): boolean {
        if (recentlyUpdatedAreas.has(area.id)) {
            return true;
        }
        const remoteEventReq = remoteRequirements.get(thing);
        if (
            remoteEventReq?.size &&
            intersects(recentlyUpdatedEvents, remoteEventReq)
        ) {
            return true;
        }
        return false;
    }

    function evaluatePartialRequirement(
        req: Requirement2,
        tod: TTimeOfDay['DayOnly'] | TTimeOfDay['NightOnly'],
    ): LogicalExpression {
        switch (req.type) {
            case 'item': {
                const bitv = new BitVector();
                for (let i = 1; i <= req.count; i++) {
                    bitv.setBit(
                        getRequirementBit(bitIndex, {
                            type: 'item',
                            name: req.name,
                            count: i,
                        }),
                    );
                }
                return new LogicalExpression([bitv]);
            }
            case 'auxItem':
            case 'trick':
            case 'rupeeCapacity':
            case 'gratitudeCrystals': {
                const bitv = new BitVector();
                bitv.setBit(getRequirementBit(bitIndex, req));
                return new LogicalExpression([bitv]);
            }

            case 'timeOfDay':
                return (tod & req.tod) !== 0
                    ? LogicalExpression.true()
                    : LogicalExpression.false();
            case 'event':
                return eventExprs[req.id] ?? LogicalExpression.false();
            case 'and': {
                let newReq = LogicalExpression.true();
                for (const t of req.terms) {
                    newReq = newReq.and(evaluatePartialRequirement(t, tod));
                }
                return newReq;
            }
            case 'or': {
                let newReq = LogicalExpression.false();
                for (const t of req.terms) {
                    newReq = newReq.or(evaluatePartialRequirement(t, tod));
                }
                return newReq;
            }
        }
    }

    function tryExits() {
        for (const exit of [...exitsToTry]) {
            if (!wasRecentlyUpdated(exit.parentArea, exit)) {
                continue;
            }
            for (const tod of [TimeOfDay.DayOnly, TimeOfDay.NightOnly]) {
                if ((tod & exit.validTod) === 0) {
                    continue;
                }
                const oldExpr =
                    areaTodExprs[tod][exit.connectedArea.id] ??
                    LogicalExpression.false();
                const newPartial = tryExitAtTime(exit, tod);
                const [useful, newExpr] = oldExpr.orExtended(newPartial);
                if (useful) {
                    newThingsFound = true;
                    newlyUpdatedAreas.add(exit.connectedArea.id);
                    areaTodExprs[tod][exit.connectedArea.id] =
                        newExpr.removeDuplicates();
                    if (!areasToTry.has(exit.connectedArea)) {
                        areasToTry.add(exit.connectedArea);
                        for (const event of exit.connectedArea.events) {
                            eventsToTry.add(event);
                        }
                        for (const newExit of exit.connectedArea.exits) {
                            const conn = mapExits[newExit.id];
                            if (conn) {
                                exitsToTry.add(conn);
                            }
                        }
                        for (const logExit of logicalExits[
                            exit.connectedArea.id
                        ] ?? []) {
                            exitsToTry.add(logExit);
                        }
                    }
                }
            }
        }
    }

    function tryExitAtTime(
        exit: UnifiedExit2,
        tod: TTimeOfDay['DayOnly'] | TTimeOfDay['NightOnly'],
    ) {
        return (
            areaTodExprs[tod][exit.parentArea.id] ?? LogicalExpression.false()
        ).and(evaluatePartialRequirement(exit.requirement, tod));
    }

    function tryAccessAtTime(
        access: EventAccess2 | LocationAccess2,
        tod: TTimeOfDay['DayOnly'] | TTimeOfDay['NightOnly'],
    ) {
        return (
            areaTodExprs[tod][access.parentArea] ?? LogicalExpression.false()
        ).and(
            evaluatePartialRequirement(
                logic.requirements[access.requirementsIdx],
                tod,
            ),
        );
    }

    function tryEvents() {
        for (const event of eventsToTry) {
            if (!wasRecentlyUpdated(logic.areas[event.parentArea], event)) {
                continue;
            }
            const oldExpr =
                eventExprs[event.eventId] ?? LogicalExpression.false();
            const newPartial = tryAccessAtTime(event, TimeOfDay.DayOnly).or(
                tryAccessAtTime(event, TimeOfDay.NightOnly),
            );
            const [useful, newExpr] = oldExpr.orExtended(newPartial);
            if (useful) {
                newThingsFound = true;
                eventExprs[event.eventId] = newExpr.removeDuplicates();
                newlyUpdatedEvents.add(event.eventId);
            }
        }
    }

    function trySleep() {
        for (const area of areasToTry) {
            if (!area.canSleep || !recentlyUpdatedAreas.has(area.id)) {
                continue;
            }
            for (const tod of [TimeOfDay.DayOnly, TimeOfDay.NightOnly]) {
                const oldExpr =
                    areaTodExprs[tod][area.id] ?? LogicalExpression.false();
                const oppositeTod =
                    tod === TimeOfDay.DayOnly
                        ? TimeOfDay.NightOnly
                        : TimeOfDay.DayOnly;
                const newPartial = areaTodExprs[oppositeTod][area.id];
                if (!newPartial) {
                    continue;
                }
                const [useful, newExpr] = oldExpr.orExtended(newPartial);
                if (useful) {
                    newThingsFound = true;
                    newlyUpdatedAreas.add(area.id);
                    areaTodExprs[tod][area.id] = newExpr.removeDuplicates();
                }
            }
        }
    }

    while (newThingsFound) {
        recentlyUpdatedAreas = newlyUpdatedAreas;
        recentlyUpdatedEvents = newlyUpdatedEvents;
        newlyUpdatedAreas = new Set();
        newlyUpdatedEvents = new Set();
        newThingsFound = false;

        tryExits();
        tryEvents();
        trySleep();
    }

    const locationAccessLists: Record<string, LocationAccess2[]> = {};
    for (const area of Object.values(logic.areas)) {
        for (const location of area.locations) {
            (locationAccessLists[location.locationId] ??= []).push(location);
        }
    }
    for (const [id, list] of Object.entries(locationAccessLists)) {
        let expr = LogicalExpression.false();
        for (const access of list) {
            expr = expr.or(
                tryAccessAtTime(access, TimeOfDay.DayOnly).or(
                    tryAccessAtTime(access, TimeOfDay.DayOnly),
                ),
            );
        }
        g.locationExitDnfs[id] = expr;
    }

    for (const area of Object.values(logic.areas)) {
        for (const exit of area.exits) {
            let expr = LogicalExpression.false();
            for (const tod of [TimeOfDay.DayOnly, TimeOfDay.NightOnly]) {
                if ((tod & area.allowedTimeOfDay) !== 0) {
                    expr = expr.or(
                        (
                            areaTodExprs[tod][exit.parentArea] ??
                            LogicalExpression.false()
                        ).and(
                            evaluatePartialRequirement(
                                logic.requirements[exit.requirementsIdx],
                                tod,
                            ),
                        ),
                    );
                }
            }
            g.locationExitDnfs[exit.id] = expr;
        }
    }

    g.bitIndex = bitIndex;
}

function analyze(checkId: string): RecursiveTooltipRequirement2 {
    const bottomUpExpression = g.locationExitDnfs[checkId].removeDuplicates();
    const simplifyStart = performance.now();
    const simplified = dnfToRequirementExpr(
        g.bitIndex!,
        g.logic,
        bottomUpExpression.conjunctions,
    );
    appDebug(
        '  ',
        'worker',
        'simplifying took',
        performance.now() - simplifyStart,
        'ms',
    );
    return simplified;
}
