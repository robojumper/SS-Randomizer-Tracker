import _ from 'lodash';
import { BitVector } from './bitlogic/BitVector';
import { LogicalExpression } from './bitlogic/LogicalExpression';
import {
    RawLogic,
    RawArea,
    TimeOfDay,
    RawEntrance,
    RawExit,
} from './UpstreamTypes';
import {
    cubeCheckToCanAccessCube,
    requiredDungeonsCompletedFakeRequirement,
} from './TrackerModifications';
import { BitLogic } from './bitlogic/BitLogic';
import { booleanExprToLogicalExpr, parseExpression } from './booleanlogic/ExpressionParse';

export interface Logic {
    bitLogic: BitLogic;

    allItems: string[];
    /**
     * Requirements that will always imply each other by construction. Progressive Sword x 2 will always
     * imply Progressive Sword x 1.
     * A map from item K to other items V such that for every V: V -> K
     */
    dominators: Record<string, string[]>;
    /** Maps from items K to items V such that for every V: K -> V */
    reverseDominators: Record<string, string[]>;
    items: Record<string, [vec: BitVector, bitIndex: number]>;
    areaGraph: AreaGraph;
    checks: Record<string, LogicalCheck>;
    checksByArea: Record<string, string[]>;
}

export interface LogicalCheck {
    type:
        | 'regular'
        | 'loose_crystal'
        | 'gossip_stone'
        | 'trial_treasure'
        | 'rupee'
        | 'tadtone'
        | 'beedle_shop'
        | 'tr_cube'
        | 'tr_dummy';
    name: string;
}

export interface AreaGraph {
    rootArea: Area;
    areas: Record<string, Area>;
    areasByEntrance: Record<string, Area>;
    areasByExit: Record<string, Area>;
    vanillaConnections: { [from: string]: string };
    entrances: Record<string, RawEntrance>;
    exits: Record<string, RawExit>;
}

export interface Area {
    abstract: boolean;
    name: string;
    locations: [location: BitVector, predicate: LogicalExpression][];
    subAreas: Record<string, Area>;
    allowedTimeOfDay: TimeOfDay;
    /** The exits of this area */
    exits: Exit[];
    /** The possible ways to get into this area, an entry in Logic.entrances */
    entrances: string[];
}

type Exit =
    | {
          type: 'logicalExit';
          /** a fully resolved name of another area. */
          toArea: string;
      }
    | {
          type: 'exitToEntrance';
          /**
           * Which exit this leads to, an entry in Logic.exits
           */
          toConnector: string;
      };

export function makeDay(loc: string) {
    return `${loc}_DAY`;
}

export function makeNight(loc: string) {
    return `${loc}_NIGHT`;
}

const itemIndexPat = /^(.+) #(\d+)$/;

function itemName(item: string, amount: number) {
    return amount > 1 ? `${item} x ${amount}` : item;
}

/**
 * Turns all "<Item> #<number>" requirements into "<Item> x <number+1>"
 * requirements - this works better with the tracker.
 */
export function preprocessItems(raw: string[]): {
    newItems: string[];
    dominators: Logic['dominators'];
    reverseDominators: Logic['reverseDominators'];
} {
    const dominators: Logic['dominators'] = {};
    const reverseDominators: Logic['reverseDominators'] = {};
    const newItems = raw.map((rawItem) => {
        const match = rawItem.match(itemIndexPat);
        if (!match) {
            return rawItem;
        } else {
            const [, item, amount_] = match;
            const amount = parseInt(amount_, 10) + 1;

            for (let i = 0; i <= amount; i++) {
                (dominators[itemName(item, i)] ??= []).push(
                    itemName(item, amount),
                );
                (reverseDominators[itemName(item, amount)] ??= []).push(
                    itemName(item, i),
                );
            }

            return itemName(item, amount);
        }
    });

    return { newItems, dominators, reverseDominators };
}

export function parseLogic(raw: RawLogic): Logic {
    const canAccessCubeReqs = Object.values(cubeCheckToCanAccessCube);
    const { newItems, dominators, reverseDominators } = preprocessItems(
        raw.items,
    );
    const rawItems = [
        ...newItems,
        ...canAccessCubeReqs,
        requiredDungeonsCompletedFakeRequirement,
    ];

    const checks: Logic['checks'] = _.mapValues(raw.checks, (check) => {
        return {
            name: check.short_name,
            type: getCheckType(check.short_name, check.type),
        } as const;
    });

    for (const cubeCheck of Object.keys(cubeCheckToCanAccessCube)) {
        checks[cubeCheck] = {
            type: 'tr_cube',
            name: _.last(cubeCheck.split('\\'))!,
        };
    }

    for (const [gossipStoneId, gossipStoneName] of Object.entries(raw.gossip_stones)) {
        checks[gossipStoneId] = {
            type: 'gossip_stone',
            name: gossipStoneName,
        };
    }

    checks[requiredDungeonsCompletedFakeRequirement] = {
        name: 'Required Dungeons Completed',
        type: 'tr_dummy',
    };

    const numItems = rawItems.length;

    const bitLogic: BitLogic = {
        numBits: numItems,
        implications: new Array<LogicalExpression>(numItems).fill(
            LogicalExpression.false(),
        ),
    };

    const items: Logic['items'] = {};
    const areasByExit: AreaGraph['areasByExit'] = {};
    const checksByArea: Logic['checksByArea'] = {};

    const entrancesByShortName: {
        [shortName: string]: { def: RawEntrance; id: string };
    } = {};
    let idx = 0;
    for (const rawItem of rawItems) {
        items[rawItem] = [new BitVector(numItems).setBit(idx), idx];
        idx++;
    }

    const dummy_day_bit = items['Day'][1];
    const dummy_night_bit = items['Night'][1];

    const allAreas: AreaGraph['areas'] = {};

    const lookup = (id: string) => {
        const item = items[id];
        if (!item) {
            throw new Error('bad item ' + id);
        }
        return item[1];
    };

    const parseExpr = (expr: string) => {
        return new LogicalExpression(booleanExprToLogicalExpr(bitLogic.numBits, parseExpression(expr), lookup));
    }

    const vec = (id: string) => items[id][0];
    const bit = (id: string) => items[id][1];
    const dayVec = (id: string) => items[makeDay(id)][0];
    const dayBit = (id: string) => items[makeDay(id)][1];
    const nightVec = (id: string) => items[makeNight(id)][0];
    const nightBit = (id: string) => items[makeNight(id)][1];

    function createAreaIndex(rawArea: RawArea) {
        const area: Area = {
            abstract: rawArea.abstract,
            name: rawArea.name,
            allowedTimeOfDay: rawArea.allowed_time_of_day,
            exits: [],
            entrances: [],
            subAreas: {},
            locations: [],
        };
        allAreas[area.name] = area;
        if (!_.isEmpty(rawArea.sub_areas)) {
            for (const rawSubArea of Object.values(rawArea.sub_areas)) {
                const subArea = createAreaIndex(rawSubArea);
                area.subAreas[rawSubArea.name] = subArea;
            }
        }

        return area;
    }

    function populateArea(rawArea: RawArea): Area {
        const area = allAreas[rawArea.name];
        if (!_.isEmpty(rawArea.sub_areas)) {
            for (const rawSubArea of Object.values(rawArea.sub_areas)) {
                populateArea(rawSubArea);
            }
        }

        if (rawArea.can_sleep) {
            if (rawArea.allowed_time_of_day !== TimeOfDay.Both) {
                throw new Error(`cannot sleep in ${rawArea.name}`);
            }

            const areaDayIdx = dayBit(rawArea.name);
            const areaNightIdx = nightBit(rawArea.name);
            bitLogic.implications[areaDayIdx] = bitLogic.implications[
                areaDayIdx
            ].or(nightVec(rawArea.name));
            bitLogic.implications[areaNightIdx] = bitLogic.implications[
                areaNightIdx
            ].or(dayVec(rawArea.name));
        }

        if (rawArea.exits) {
            for (const [exit, exitRequirementExpression] of Object.entries(
                rawArea.exits,
            )) {
                const expr = parseExpr(exitRequirementExpression);
                const fullExitName = exit.startsWith('\\')
                    ? exit
                    : `${rawArea.name}\\${exit}`;
                if (allAreas[fullExitName]) {
                    // logical exit
                    const destArea = allAreas[fullExitName];
                    if (destArea.allowedTimeOfDay === TimeOfDay.Both) {
                        const dest_area_day_idx = dayBit(destArea.name);
                        const dest_area_night_idx = nightBit(destArea.name);

                        if (area.allowedTimeOfDay === TimeOfDay.Both) {
                            bitLogic.implications[dest_area_day_idx] =
                                bitLogic.implications[dest_area_day_idx].or(
                                    expr
                                        .drop_unless(
                                            dummy_day_bit,
                                            dummy_night_bit,
                                        )
                                        .and(dayVec(rawArea.name)),
                                );
                            bitLogic.implications[dest_area_night_idx] =
                                bitLogic.implications[dest_area_night_idx].or(
                                    expr
                                        .drop_unless(
                                            dummy_night_bit,
                                            dummy_day_bit,
                                        )
                                        .and(nightVec(rawArea.name)),
                                );
                        } else if (
                            area.allowedTimeOfDay === TimeOfDay.DayOnly
                        ) {
                            bitLogic.implications[dest_area_day_idx] =
                                bitLogic.implications[dest_area_day_idx].or(
                                    expr
                                        .drop_unless(
                                            dummy_day_bit,
                                            dummy_night_bit,
                                        )
                                        .and(vec(rawArea.name)),
                                );
                        } else if (
                            area.allowedTimeOfDay === TimeOfDay.NightOnly
                        ) {
                            bitLogic.implications[dest_area_night_idx] =
                                bitLogic.implications[dest_area_night_idx].or(
                                    expr
                                        .drop_unless(
                                            dummy_night_bit,
                                            dummy_day_bit,
                                        )
                                        .and(vec(rawArea.name)),
                                );
                        } else {
                            throw new Error('bad ToD requirement');
                        }
                    } else {
                        const areaBit = bit(destArea.name);
                        let timedReq: LogicalExpression;
                        let timedArea: () => BitVector;
                        if (destArea.allowedTimeOfDay === TimeOfDay.DayOnly) {
                            timedReq = expr.drop_unless(
                                dummy_day_bit,
                                dummy_night_bit,
                            );
                            timedArea = () => dayVec(area.name);
                        } else if (
                            destArea.allowedTimeOfDay === TimeOfDay.NightOnly
                        ) {
                            timedReq = expr.drop_unless(
                                dummy_night_bit,
                                dummy_day_bit,
                            );
                            timedArea = () => nightVec(area.name);
                        } else {
                            throw new Error('bad ToD requirement');
                        }

                        if (area.allowedTimeOfDay === TimeOfDay.Both) {
                            bitLogic.implications[areaBit] =
                                bitLogic.implications[areaBit].or(
                                    timedReq.and(timedArea()),
                                );
                        } else if (
                            area.allowedTimeOfDay === destArea.allowedTimeOfDay
                        ) {
                            bitLogic.implications[areaBit] =
                                bitLogic.implications[areaBit].or(
                                    timedReq.and(vec(area.name)),
                                );
                        }
                    }

                    area.exits.push({
                        type: 'logicalExit',
                        toArea: fullExitName,
                    });
                } else if (raw.exits[fullExitName]) {
                    areasByExit[fullExitName] = area;
                    const exitBit = items[fullExitName][1];
                    if (area.abstract) {
                        if (fullExitName !== '\\Start') {
                            throw new Error(
                                'abstract area can only exit to start',
                            );
                        }
                        bitLogic.implications[exitBit] = expr;
                    } else if (area.allowedTimeOfDay === TimeOfDay.Both) {
                        bitLogic.implications[exitBit] = bitLogic.implications[
                            exitBit
                        ].or(
                            expr
                                .drop_unless(dummy_day_bit, dummy_night_bit)
                                .and(dayVec(rawArea.name)),
                        );
                        bitLogic.implications[exitBit] = bitLogic.implications[
                            exitBit
                        ].or(
                            expr
                                .drop_unless(dummy_night_bit, dummy_day_bit)
                                .and(nightVec(rawArea.name)),
                        );
                    } else if (area.allowedTimeOfDay === TimeOfDay.DayOnly) {
                        bitLogic.implications[exitBit] = bitLogic.implications[
                            exitBit
                        ].or(
                            expr
                                .drop_unless(dummy_day_bit, dummy_night_bit)
                                .and(vec(rawArea.name)),
                        );
                    } else if (area.allowedTimeOfDay === TimeOfDay.NightOnly) {
                        bitLogic.implications[exitBit] = bitLogic.implications[
                            exitBit
                        ].or(
                            expr
                                .drop_unless(dummy_night_bit, dummy_day_bit)
                                .and(vec(rawArea.name)),
                        );
                    } else {
                        throw new Error('bad ToD requirement');
                    }

                    area.exits.push({
                        type: 'exitToEntrance',
                        toConnector: fullExitName,
                    });
                } else {
                    throw new Error(
                        `${rawArea.name} area ${fullExitName} not resolved`,
                    );
                }
            }
        }

        if (rawArea.entrances) {
            for (const entrance of rawArea.entrances) {
                area.entrances.push(`${rawArea.name}\\${entrance}`);

                const fullEntranceName = `${rawArea.name}\\${entrance}`;
                const entranceDef = raw.entrances[fullEntranceName];

                // Are both of these needed???

                entrancesByShortName[entranceDef.short_name] = {
                    def: entranceDef,
                    id: fullEntranceName,
                };

                entrancesByShortName[entrance] = {
                    def: entranceDef,
                    id: fullEntranceName,
                };

                if (entranceDef.allowed_time_of_day === TimeOfDay.Both) {
                    const areaDayBit = dayBit(area.name);
                    const areaNightBit = nightBit(area.name);
                    bitLogic.implications[areaDayBit] = bitLogic.implications[
                        areaDayBit
                    ].or(dayVec(fullEntranceName));
                    bitLogic.implications[areaNightBit] = bitLogic.implications[
                        areaNightBit
                    ].or(nightVec(fullEntranceName));
                } else {
                    const entranceBit = vec(fullEntranceName);
                    if (area.allowedTimeOfDay === TimeOfDay.Both) {
                        if (
                            entranceDef.allowed_time_of_day ===
                            TimeOfDay.DayOnly
                        ) {
                            const bit = dayBit(area.name);
                            bitLogic.implications[bit] =
                                bitLogic.implications[bit].or(entranceBit);
                        } else if (
                            entranceDef.allowed_time_of_day ===
                            TimeOfDay.NightOnly
                        ) {
                            const bit = nightBit(area.name);
                            bitLogic.implications[bit] =
                                bitLogic.implications[bit].or(entranceBit);
                        } else {
                            throw new Error('bad ToD requirement');
                        }
                    } else {
                        const areaBit = bit(area.name);
                        bitLogic.implications[areaBit] =
                            bitLogic.implications[areaBit].or(entranceBit);
                    }
                }
            }
        }

        if (rawArea.locations) {
            for (const [
                location,
                locationRequirementExpression,
            ] of Object.entries(rawArea.locations)) {
                let locName = location.startsWith('\\')
                    ? location
                    : `${area.name}\\${location}`;

                if (!location.startsWith('\\')) {
                    const check = checks[locName];
                    if (check) {
                        let region: string | null | undefined =
                            rawArea.hint_region;
                        if (
                            !region &&
                            (locName.includes('Goddess Cube at Ride') ||
                                locName.includes(
                                    'Gossip Stone in Temple of Time Area',
                                ))
                        ) {
                            region = 'Lanayru Desert';
                        }
                        if (!region) {
                            throw new Error('check has no region?');
                        }
                        if (check.type === 'tr_cube') {
                            check.name = `${region} - ${check.name}`
                        }
                        (checksByArea[region] ??= []).push(locName);
                    }
                }

                // Is this a goddess cube location? Then replace it with the fake "can access" requirement.
                if (cubeCheckToCanAccessCube[locName]) {
                    const canAccessReq = cubeCheckToCanAccessCube[locName];
                    locName = canAccessReq;
                }

                const locVec = items[locName];
                if (!locVec) {
                    throw new Error('bad requirement ' + locName);
                }
                let timed_req: LogicalExpression;

                const expr = parseExpr(locationRequirementExpression);
                if (rawArea.abstract) {
                    timed_req = expr;
                } else if (rawArea.allowed_time_of_day === TimeOfDay.Both) {
                    timed_req = expr
                        .drop_unless(dummy_day_bit, dummy_night_bit)
                        .and(dayVec(area.name))
                        .or(
                            expr
                                .drop_unless(dummy_night_bit, dummy_day_bit)
                                .and(nightVec(area.name)),
                        );
                } else if (rawArea.allowed_time_of_day === TimeOfDay.DayOnly) {
                    timed_req = expr
                        .drop_unless(dummy_day_bit, dummy_night_bit)
                        .and(vec(area.name));
                } else if (
                    rawArea.allowed_time_of_day === TimeOfDay.NightOnly
                ) {
                    timed_req = expr
                        .drop_unless(dummy_night_bit, dummy_night_bit)
                        .and(vec(area.name));
                } else {
                    throw new Error('bad ToD requirement');
                }
                bitLogic.implications[locVec[1]] =
                    bitLogic.implications[locVec[1]].or(timed_req);
                area.locations.push([locVec[0], expr]);
            }
        }

        return area;
    }

    createAreaIndex(raw.areas);
    const rootArea = populateArea(raw.areas);
    if (!rootArea.abstract) {
        throw new Error('rootArea must be abstract');
    }

    const areasByEntrance: AreaGraph['areasByEntrance'] = {};
    for (const area of Object.values(allAreas)) {
        for (const entrance of area.entrances) {
            areasByEntrance[entrance] = area;
        }
    }

    // validate
    for (const area of Object.values(allAreas)) {
        for (const entrance of area.entrances) {
            if (!raw.entrances[entrance]) {
                throw new Error(`entrance ${entrance} does not exist`);
            }
        }
        for (const exit of area.exits) {
            switch (exit.type) {
                case 'logicalExit': {
                    const targetArea = allAreas[exit.toArea];
                    if (!targetArea) {
                        throw new Error(
                            `${area.name} -> exit to area ${exit.toArea} does not exist`,
                        );
                    } else if (targetArea.abstract) {
                        throw new Error(
                            `${area.name} -> exit to area ${exit.toArea} leads to abstract area`,
                        );
                    }
                    break;
                }
                case 'exitToEntrance': {
                    const connector = raw.exits[exit.toConnector];
                    if (!connector) {
                        throw new Error(
                            `exit to connector ${exit.toConnector} does not exist`,
                        );
                    }
                    break;
                }
            }
        }
    }

    const vanillaConnections: AreaGraph['vanillaConnections'] = {};
    for (const [exitId, exitDef] of Object.entries(raw.exits)) {
        if (exitDef.vanilla) {
            vanillaConnections[exitId] =
                entrancesByShortName[exitDef.vanilla].id;
        }
    }

    return {
        bitLogic,
        allItems: rawItems,
        dominators,
        reverseDominators,
        items,
        checks,
        checksByArea,
        areaGraph: {
            areas: allAreas,
            rootArea,
            areasByEntrance,
            areasByExit,
            entrances: raw.entrances,
            exits: raw.exits,
            vanillaConnections,
        },
    };
}

function getCheckType(
    checkName: string,
    checkType: string | null,
): LogicalCheck['type'] {
    if (!checkType) {
        return 'regular';
    }

    if (checkType.includes('Rupee')) {
        return 'rupee';
    } else if (checkType.includes('silent realm')) {
        return 'trial_treasure';
    } else if (checkType.includes('Loose Crystals')) {
        return 'loose_crystal';
    } else if (checkType.includes("Beedle's Shop Purchases")) {
        return 'beedle_shop';
    } else if (
        checkType.includes('Tadtones') &&
        !checkName.includes("Water Dragon's Reward")
    ) {
        return 'tadtone';
    } else {
        return 'regular';
    }
}
