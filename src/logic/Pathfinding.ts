import { once } from 'es-toolkit';
import { TimeOfDay, type TTimeOfDay } from './Mappers';
import type { SearchExits2 } from './logic2/Entrance';
import type { Logic2 } from './logic2/Logic';
import { evaluateRequirement, type SearchState2 } from './logic2/Search';

/*
The pathfinding algorithm starts at the Start entrance with its specific time of day,
and then walks the area graph (potentially with its requirements).
*/

type SpecificTimeOfDay = TTimeOfDay['DayOnly'] | TTimeOfDay['NightOnly'];

export interface ExplorationNode {
    area: string;
    timeOfDay: SpecificTimeOfDay;
    parent: ExplorationNode | undefined;
    edge: string | undefined;
}

function nodeKey(node: ExplorationNode) {
    return `${node.area}_${node.timeOfDay}`;
}

export function exploreAreaGraph(
    areaGraph: Logic2,
    exits: SearchExits2,
    searchState: SearchState2,
) {
    const { mapExits, logicalExits } = exits;
    const startConnection = mapExits['\\Start'];
    if (!startConnection || startConnection.type !== 'mapExit') {
        return undefined;
    }
    const startingArea = startConnection.connectedArea;
    if (
        startConnection.validTod !== TimeOfDay.DayOnly &&
        startConnection.validTod !== TimeOfDay.NightOnly
    ) {
        return undefined;
    }

    const startingNode: ExplorationNode = {
        area: startingArea.id,
        timeOfDay: startConnection.validTod,
        parent: undefined,
        edge: undefined,
    };
    const visitedNodes: Record<string, ExplorationNode> = {};
    visitedNodes[nodeKey(startingNode)] = startingNode;
    const workList = [startingNode];

    const reachableChecks: Record<string, ExplorationNode> = {};

    while (workList.length) {
        const workItem = workList.pop()!;
        const area = areaGraph.areas[workItem.area];
        const currentTimeOfDay = workItem.timeOfDay;
        if (area.canSleep) {
            const oppositeTimeOfDay: SpecificTimeOfDay =
                currentTimeOfDay === TimeOfDay.DayOnly
                    ? TimeOfDay.NightOnly
                    : TimeOfDay.DayOnly;
            const nextNode = {
                timeOfDay: oppositeTimeOfDay,
                area: area.id,
                parent: workItem,
                edge: 'Sleep',
            };
            if (!visitedNodes[nodeKey(nextNode)]) {
                visitedNodes[nodeKey(nextNode)] = nextNode;
                workList.unshift(nextNode);
            }
        }

        for (const location of area.locations) {
            const condition = areaGraph.requirements[location.requirementsIdx];
            if (
                !reachableChecks[location.locationId] &&
                evaluateRequirement(searchState, condition, currentTimeOfDay)
            ) {
                reachableChecks[location.locationId] = workItem;
            }
        }

        for (const exit of area.exits) {
            const condition = areaGraph.requirements[exit.requirementsIdx];
            const metRequirement = once(() =>
                evaluateRequirement(searchState, condition, currentTimeOfDay),
            );
            if (!reachableChecks[exit.id] && metRequirement()) {
                reachableChecks[exit.id] = workItem;
            }
            const connection = mapExits[exit.id];
            if (connection) {
                const destArea = connection.connectedArea;
                const nextNode = {
                    timeOfDay: currentTimeOfDay,
                    area: destArea.id,
                    parent: workItem,
                    edge: exit.name,
                };

                if (
                    metRequirement() &&
                    !visitedNodes[nodeKey(nextNode)] &&
                    (destArea.allowedTimeOfDay & currentTimeOfDay) !== 0
                ) {
                    visitedNodes[nodeKey(nextNode)] = nextNode;
                    workList.unshift(nextNode);
                }
            }
        }

        for (const connection of logicalExits[area.id]) {
            const condition = connection.requirement;
            const destArea = connection.connectedArea;
            const nextNode = {
                timeOfDay: currentTimeOfDay,
                area: destArea.id,
                parent: workItem,
                edge: undefined,
            };

            if (
                evaluateRequirement(searchState, condition, currentTimeOfDay) &&
                !visitedNodes[nodeKey(nextNode)] &&
                (destArea.allowedTimeOfDay & currentTimeOfDay) !== 0
            ) {
                visitedNodes[nodeKey(nextNode)] = nextNode;
                workList.unshift(nextNode);
            }
        }
    }

    return reachableChecks;
}
