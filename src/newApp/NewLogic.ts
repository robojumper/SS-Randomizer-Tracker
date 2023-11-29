import _ from 'lodash';
import { BitVector } from './BitVector';
import { LogicalExpression } from './LogicalExpression';
import {
    RawLogic,
    RawArea,
    TimeOfDay,
    RawEntrance,
    RawExit,
} from './UpstreamTypes';
import { cubeCheckToCanAccessCube } from './TrackerModifications';

export interface Logic {
    numItems: number;
    allItems: string[];
    items: Record<string, [vec: BitVector, bitIndex: number]>;
    startingItems: BitVector;
    areaGraph: AreaGraph;
    checks: Record<string, LogicalCheck>;
    checksByArea: Record<string, string[]>;
    /**
     * array index is bit index. value at that index is a logical
     * expression that, if evaluated to true, implies the given bit index
     */
    implications: LogicalExpression[];
}

export interface LogicalCheck {
    type:
        | 'regular'
        | 'loose_crystal'
        | 'trial_treasure'
        | 'rupee'
        | 'beedle_shop'
        | 'tr_cube';
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
    parentArea: Area | undefined;
    subAreas: Record<string, Area>;
    allowedTimeOfDay: TimeOfDay;
    /** The exits of this area, and the things needed to get there */
    exits: Exit[];
    /** The possible ways to get into this area, an entry in Logic.entrances */
    entrances: string[];
}

type Exit =
    | {
          type: 'logicalExit';
          /** a fully resolved name of another area. */
          toArea: string;
          condition: LogicalExpression;
      }
    | {
          type: 'exitToEntrance';
          /**
           * Which exit this leads to, an entry in Logic.exits
           */
          toConnector: string;
          condition: LogicalExpression;
      };

export function makeDay(loc: string) {
    return `${loc}_DAY`;
}

export function makeNight(loc: string) {
    return `${loc}_NIGHT`;
}

const itemIndexPat = /^(.+) #(\d+)$/;

/**
 * Turns all "<Item> #<number>" requirements into "<Item> x <number+1>"
 * requirements - this works better with the tracker.
 */
export function preprocessItems(raw: string[]): string[] {
    return raw.map((rawItem) => {
        const match = rawItem.match(itemIndexPat);
        if (!match) {
            return rawItem;
        } else {
            const [, item, amount_] = match;
            const amount = parseInt(amount_, 10) + 1;
            return amount > 1 ? `${item} x ${amount}` : item;
        }
    });
}

export function parseLogic(raw: RawLogic): Logic {
    const canAccessCubeReqs = Object.values(cubeCheckToCanAccessCube);
    const rawItems = ['False', 'True', ...preprocessItems(raw.items), ...canAccessCubeReqs];

    const checks: Logic['checks'] = _.mapValues(raw.checks, (check) => {
        return {
            name: check.short_name,
            type: getCheckType(check.type),
        } as const;
    });

    for (const cubeCheck of Object.keys(cubeCheckToCanAccessCube)) {
        checks[cubeCheck] = {
            type: 'tr_cube',
            name: _.last(cubeCheck.split('\\'))!,
        };
    }

    const numItems = rawItems.length;
    // Link starts with True
    const startingItems = new BitVector(numItems).setBit(1);

    const items: Logic['items'] = {};
    const vanillaExits: AreaGraph['vanillaConnections'] = {};
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

    const implications: LogicalExpression[] = new Array<LogicalExpression>(
        numItems,
    ).fill(new LogicalExpression([]));

    const lookup = (id: string) => {
        const item = items[id];
        if (!item) {
            throw new Error('bad item ' + id);
        }
        return item[1];
    };

    const vec = (id: string) => items[id][0];
    const bit = (id: string) => items[id][1];
    const dayVec = (id: string) => items[makeDay(id)][0];
    const dayBit = (id: string) => items[makeDay(id)][1];
    const nightVec = (id: string) => items[makeNight(id)][0];
    const nightBit = (id: string) => items[makeNight(id)][1];

    function createAreaIndex(rawArea: RawArea, parentArea: Area | undefined) {
        const area: Area = {
            abstract: rawArea.abstract,
            name: rawArea.name,
            allowedTimeOfDay: rawArea.allowed_time_of_day,
            exits: [],
            entrances: [],
            subAreas: {},
            locations: [],
            parentArea,
        };
        allAreas[area.name] = area;
        if (!_.isEmpty(rawArea.sub_areas)) {
            for (const rawSubArea of Object.values(rawArea.sub_areas)) {
                const subArea = createAreaIndex(rawSubArea, area);
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
            implications[areaDayIdx] = implications[areaDayIdx].or(
                nightVec(rawArea.name),
            );
            implications[areaNightIdx] = implications[areaNightIdx].or(
                dayVec(rawArea.name),
            );
        }

        if (rawArea.exits) {
            for (const [exit, exitRequirementExpression] of Object.entries(
                rawArea.exits,
            )) {
                const expr = new LogicalExpression(
                    numItems,
                    exitRequirementExpression,
                    lookup,
                );
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
                            implications[dest_area_day_idx] = implications[
                                dest_area_day_idx
                            ].or(
                                expr
                                    .drop_unless(dummy_day_bit, dummy_night_bit)
                                    .and(dayVec(rawArea.name)),
                            );
                            implications[dest_area_night_idx] = implications[
                                dest_area_night_idx
                            ].or(
                                expr
                                    .drop_unless(dummy_night_bit, dummy_day_bit)
                                    .and(nightVec(rawArea.name)),
                            );
                        } else if (
                            area.allowedTimeOfDay === TimeOfDay.DayOnly
                        ) {
                            implications[dest_area_day_idx] = implications[
                                dest_area_day_idx
                            ].or(
                                expr
                                    .drop_unless(dummy_day_bit, dummy_night_bit)
                                    .and(vec(rawArea.name)),
                            );
                        } else if (
                            area.allowedTimeOfDay === TimeOfDay.NightOnly
                        ) {
                            implications[dest_area_night_idx] = implications[
                                dest_area_night_idx
                            ].or(
                                expr
                                    .drop_unless(dummy_night_bit, dummy_day_bit)
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
                            implications[areaBit] = implications[areaBit].or(
                                timedReq.and(timedArea()),
                            );
                        } else if (
                            area.allowedTimeOfDay === destArea.allowedTimeOfDay
                        ) {
                            implications[areaBit] = implications[areaBit].or(
                                timedReq.and(vec(area.name)),
                            );
                        }
                    }

                    area.exits.push({
                        type: 'logicalExit',
                        toArea: fullExitName,
                        condition: new LogicalExpression(
                            numItems,
                            exitRequirementExpression,
                            lookup,
                        ),
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
                        implications[exitBit] = expr;
                    } else if (area.allowedTimeOfDay === TimeOfDay.Both) {
                        implications[exitBit] = implications[exitBit].or(
                            expr
                                .drop_unless(dummy_day_bit, dummy_night_bit)
                                .and(dayVec(rawArea.name)),
                        );
                        implications[exitBit] = implications[exitBit].or(
                            expr
                                .drop_unless(dummy_night_bit, dummy_day_bit)
                                .and(nightVec(rawArea.name)),
                        );
                        vanillaExits[makeDay(rawArea.name)];
                    } else if (area.allowedTimeOfDay === TimeOfDay.DayOnly) {
                        implications[exitBit] = implications[exitBit].or(
                            expr
                                .drop_unless(dummy_day_bit, dummy_night_bit)
                                .and(vec(rawArea.name)),
                        );
                    } else if (area.allowedTimeOfDay === TimeOfDay.NightOnly) {
                        implications[exitBit] = implications[exitBit].or(
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
                        condition: new LogicalExpression(
                            numItems,
                            exitRequirementExpression,
                            lookup,
                        ),
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
                    implications[areaDayBit] = implications[areaDayBit].or(
                        dayVec(fullEntranceName),
                    );
                    implications[areaNightBit] = implications[areaNightBit].or(
                        nightVec(fullEntranceName),
                    );
                } else {
                    const entranceBit = vec(fullEntranceName);
                    if (area.allowedTimeOfDay === TimeOfDay.Both) {
                        if (
                            entranceDef.allowed_time_of_day ===
                            TimeOfDay.DayOnly
                        ) {
                            const bit = dayBit(area.name);
                            implications[bit] =
                                implications[bit].or(entranceBit);
                        } else if (
                            entranceDef.allowed_time_of_day ===
                            TimeOfDay.NightOnly
                        ) {
                            const bit = nightBit(area.name);
                            implications[bit] =
                                implications[bit].or(entranceBit);
                        } else {
                            throw new Error('bad ToD requirement');
                        }
                    } else {
                        const areaBit = bit(area.name);
                        implications[areaBit] =
                            implications[areaBit].or(entranceBit);
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
                        let region: string | null | undefined = rawArea.hint_region;
                        if (locName.includes('Goddess Cube at Ride') && !region) {
                            region = 'Lanayru Desert';
                        } 
                        if (!region) {
                            throw new Error('check has no region?');
                        }
                        (checksByArea[region] ??= []).push(
                            locName,
                        );
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

                const expr = new LogicalExpression(
                    numItems,
                    locationRequirementExpression,
                    lookup,
                );
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
                implications[locVec[1]] = implications[locVec[1]].or(timed_req);
                area.locations.push([locVec[0], expr]);
            }
        }

        return area;
    }

    createAreaIndex(raw.areas, undefined);
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
        numItems,
        allItems: rawItems,
        items,
        startingItems,
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
        implications,
    };
}

function getCheckType(checkType: string | null): LogicalCheck['type'] {
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
    } else {
        return 'regular';
    }
}
