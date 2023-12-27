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
import {
    BitLogic,
    removeDuplicates,
    shallowSimplify,
    unifyRequirements,
} from './bitlogic/BitLogic';
import {
    booleanExprToLogicalExpr,
    parseExpression,
} from './booleanlogic/ExpressionParse';
import { dungeonNames } from './Locations';
import { LogicBuilder } from './LogicBuilder';

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
    itemBits: Record<string, number>,
    areaGraph: AreaGraph;
    checks: Record<string, LogicalCheck>;
    areas: string[];
    checksByHintRegion: Record<string, string[]>;
    exitsByHintRegion: Record<string, string[]>;
    dungeonCompletionRequirements: { [dungeon: string]: string }
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
        | 'gear_shop'
        | 'potion_shop'
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
    entranceHintAreas: Record<string, string>;
    exits: Record<string, RawExit>;
    /**
     * For every location/exit, a list of entrances that can reach it
     * (by virtue of being in the same area, possibly with requirements).
     */
    entrancesPerLocation: Record<string, string[]>;

    /** Sandship Dock Exit -> Exit to Sandship */
    autoExits: {
        [canonicalExit: string]: string;
    };
    entrancePools: {
        [key in keyof RawLogic['linked_entrances']]: Record<
            string,
            EntranceLinkage
        >;
    };
}

export interface EntranceLinkage {
    /** Deep Woods\Exit to SV -> SV\Exit to Deep Woods  */
    exits: [outsideExit: string, insideExit: string];
    /** SV\Main Entrance -> Deep Woods\Entrance from SV  */
    entrances: [outsideEntrance: string, insideEntrance: string];
}

export interface Area {
    abstract: boolean;
    name: string;
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
    const start = performance.now();

    const canAccessCubeReqs = Object.values(cubeCheckToCanAccessCube);
    const { newItems, dominators, reverseDominators } = preprocessItems(
        raw.items,
    );
    const rawItems = [
        ...newItems,
        ...canAccessCubeReqs,
        requiredDungeonsCompletedFakeRequirement,
    ];

    // Pessimistically, all items are opaque
    const opaqueItems = new BitVector(rawItems.length);
    for (let i = 0; i < rawItems.length; i++) {
        opaqueItems.setBit(i);
    }

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

    for (const [gossipStoneId, gossipStoneName] of Object.entries(
        raw.gossip_stones,
    )) {
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
        requirements: new Array<LogicalExpression>(numItems).fill(
            LogicalExpression.false(),
        ),
    };

    const itemBits: Logic['itemBits'] = {};
    const areasByExit: AreaGraph['areasByExit'] = {};
    const checksByHintRegion: Logic['checksByHintRegion'] = {};
    const exitsByHintRegion: Logic['exitsByHintRegion'] = {};
    const entranceHintAreas: AreaGraph['entranceHintAreas'] = {};
    const entrancesPerLocation: AreaGraph['entrancesPerLocation'] = {};
    const checksByArea: Logic['checksByHintRegion'] = {};
    const exitsByArea: Logic['exitsByHintRegion'] = {};

    const entrancesByShortName: {
        [shortName: string]: { def: RawEntrance; id: string, region: string };
    } = {};
    let idx = 0;
    for (const rawItem of rawItems) {
        itemBits[rawItem] = idx;
        idx++;
    }

    const b = new LogicBuilder(bitLogic, rawItems, bitLogic.requirements);

    const dummy_day_bit = itemBits['Day'];
    const dummy_night_bit = itemBits['Night'];
    opaqueItems.clearBit(dummy_day_bit);
    opaqueItems.clearBit(dummy_night_bit);

    const allAreas: AreaGraph['areas'] = {};

    const parseExpr = (expr: string) => {
        return new LogicalExpression(
            booleanExprToLogicalExpr(
                bitLogic.numBits,
                parseExpression(expr),
                (item: string) => b.bit(item),
            ),
        );
    };

    // Locations found in areas where we didn't find a corresponding check.
    // We better mention this "virtual" check in some other requirement.
    const nonCheckLocations = new Set<string>();

    function createAreaIndex(rawArea: RawArea) {
        const area: Area = {
            abstract: rawArea.abstract,
            name: rawArea.name,
            allowedTimeOfDay: rawArea.allowed_time_of_day,
            exits: [],
            entrances: [],
            subAreas: {},
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

            b.addAlternative(b.day(rawArea.name), b.singleBit(b.night(rawArea.name)));
            b.addAlternative(b.night(rawArea.name), b.singleBit(b.day(rawArea.name)));
        }

        const getHintRegion = (locName: string) => {
            let region: string | null | undefined =
                rawArea.hint_region;
            if (
                !region &&
                (locName.includes('Temple of Time') ||
                    locName.includes('Goddess Cube at Ride') ||
                    locName.includes('Gossip Stone in Temple of Time Area'))
            ) {
                // FIXME fix the data
                region = 'Lanayru Desert';
            }
            if (!region) {
                throw new Error(`check ${locName} has no region?`);
            }
            return region;
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
                        opaqueItems.clearBit(b.bit(b.day(destArea.name)));
                        opaqueItems.clearBit(b.bit(b.night(destArea.name)));

                        if (area.allowedTimeOfDay === TimeOfDay.Both) {
                            b.addAlternative(
                                b.day(destArea.name),
                                expr
                                    .drop_unless(dummy_day_bit, dummy_night_bit)
                                    .and(b.singleBit(b.day(rawArea.name))),
                            );
                            b.addAlternative(
                                b.night(destArea.name),
                                expr
                                    .drop_unless(dummy_night_bit, dummy_day_bit)
                                    .and(b.singleBit(b.night(rawArea.name))),
                            );
                        } else if (
                            area.allowedTimeOfDay === TimeOfDay.DayOnly
                        ) {
                            b.addAlternative(
                                b.day(destArea.name),
                                expr
                                    .drop_unless(dummy_day_bit, dummy_night_bit)
                                    .and(b.singleBit(rawArea.name)),
                            );
                        } else if (
                            area.allowedTimeOfDay === TimeOfDay.NightOnly
                        ) {
                            b.addAlternative(
                                b.night(destArea.name),
                                expr
                                    .drop_unless(dummy_night_bit, dummy_day_bit)
                                    .and(b.singleBit(rawArea.name)),
                            );
                        } else {
                            throw new Error('bad ToD requirement');
                        }
                    } else {
                        let timedReq: LogicalExpression;
                        let timedArea: () => LogicalExpression;
                        if (destArea.allowedTimeOfDay === TimeOfDay.DayOnly) {
                            timedReq = expr.drop_unless(
                                dummy_day_bit,
                                dummy_night_bit,
                            );
                            timedArea = () => b.singleBit(b.day(area.name));
                        } else if (
                            destArea.allowedTimeOfDay === TimeOfDay.NightOnly
                        ) {
                            timedReq = expr.drop_unless(
                                dummy_night_bit,
                                dummy_day_bit,
                            );
                            timedArea = () => b.singleBit(b.night(area.name));
                        } else {
                            throw new Error('bad ToD requirement');
                        }

                        if (area.allowedTimeOfDay === TimeOfDay.Both) {
                            b.addAlternative(destArea.name, timedReq.and(timedArea()));
                        } else if (
                            area.allowedTimeOfDay === destArea.allowedTimeOfDay
                        ) {
                            b.addAlternative(destArea.name, timedReq.and(b.singleBit(area.name)));
                        }
                        opaqueItems.clearBit(b.bit(destArea.name));
                    }

                    area.exits.push({
                        type: 'logicalExit',
                        toArea: fullExitName,
                    });
                } else if (raw.exits[fullExitName]) {
                    // map exit
                    areasByExit[fullExitName] = area;
                    opaqueItems.clearBit(b.bit(fullExitName));
                    if (area.abstract) {
                        if (fullExitName !== '\\Start') {
                            throw new Error(
                                'abstract area can only exit to start',
                            );
                        }
                        b.set(fullExitName, expr);
                    } else {
                        if (area.allowedTimeOfDay === TimeOfDay.Both) {
                            b.addAlternative(
                                fullExitName,
                                expr
                                    .drop_unless(dummy_day_bit, dummy_night_bit)
                                    .and(b.singleBit(b.day(rawArea.name))),
                            );
                            b.addAlternative(
                                fullExitName,
                                expr
                                    .drop_unless(dummy_night_bit, dummy_day_bit)
                                    .and(b.singleBit(b.night(rawArea.name))),
                            );
                        } else if (
                            area.allowedTimeOfDay === TimeOfDay.DayOnly
                        ) {
                            b.addAlternative(
                                fullExitName,
                                expr
                                    .drop_unless(dummy_day_bit, dummy_night_bit)
                                    .and(b.singleBit(rawArea.name)),
                            );
                        } else if (
                            area.allowedTimeOfDay === TimeOfDay.NightOnly
                        ) {
                            b.addAlternative(
                                fullExitName,
                                expr
                                    .drop_unless(dummy_night_bit, dummy_day_bit)
                                    .and(b.singleBit(rawArea.name)),
                            );
                        } else {
                            throw new Error('bad ToD requirement');
                        }

                        const region = getHintRegion(fullExitName);
                        entrancesPerLocation[fullExitName] =
                            rawArea.entrances?.map(
                                (entrance) => `${rawArea.name}\\${entrance}`,
                            ) ?? [];
                        (exitsByArea[area.name] ??= []).push(fullExitName);
                        (exitsByHintRegion[region] ??= []).push(fullExitName);
                        area.exits.push({
                            type: 'exitToEntrance',
                            toConnector: fullExitName,
                        });
                    }
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

                const region = getHintRegion(fullEntranceName);
                entranceHintAreas[fullEntranceName] = region;

                // Are both of these needed???

                entrancesByShortName[entranceDef.short_name] = {
                    def: entranceDef,
                    id: fullEntranceName,
                    region,
                };

                entrancesByShortName[entrance] = {
                    def: entranceDef,
                    id: fullEntranceName,
                    region,
                };

                if (entranceDef.allowed_time_of_day === TimeOfDay.Both) {
                    b.addAlternative(
                        b.day(area.name),
                        b.singleBit(b.day(fullEntranceName)),
                    );
                    b.addAlternative(
                        b.night(area.name),
                        b.singleBit(b.night(fullEntranceName)),
                    );
                    opaqueItems.clearBit(b.bit(b.day(area.name)));
                    opaqueItems.clearBit(b.bit(b.night(area.name)));
                } else {
                    let areaReq: string;
                    if (area.allowedTimeOfDay === TimeOfDay.Both) {
                        if (
                            entranceDef.allowed_time_of_day ===
                            TimeOfDay.DayOnly
                        ) {
                            areaReq = b.day(area.name);
                        } else if (
                            entranceDef.allowed_time_of_day ===
                            TimeOfDay.NightOnly
                        ) {
                            areaReq = b.night(area.name);
                        } else {
                            throw new Error('bad ToD requirement');
                        }
                    } else {
                        areaReq = area.name;
                    }
                    b.addAlternative(areaReq, b.singleBit(fullEntranceName));
                    opaqueItems.clearBit(b.bit(areaReq));
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
                        const region = getHintRegion(locName);
                        if (check.type === 'tr_cube') {
                            check.name = `${region} - ${check.name}`;
                        }
                        entrancesPerLocation[locName] =
                        rawArea.entrances?.map(
                            (entrance) => `${rawArea.name}\\${entrance}`,
                        ) ?? [];
                        (checksByArea[area.name] ??= []).push(locName);
                        (checksByHintRegion[region] ??= []).push(locName);
                    } else {
                        nonCheckLocations.add(locName);
                    }
                }

                // Is this a goddess cube location? Then replace it with the fake "can access" requirement.
                if (cubeCheckToCanAccessCube[locName]) {
                    const canAccessReq = cubeCheckToCanAccessCube[locName];
                    locName = canAccessReq;
                }

                let timed_req: LogicalExpression;
                opaqueItems.clearBit(b.bit(locName));

                const expr = parseExpr(locationRequirementExpression);
                if (rawArea.abstract) {
                    timed_req = expr;
                } else if (rawArea.allowed_time_of_day === TimeOfDay.Both) {
                    timed_req = expr
                        .drop_unless(dummy_day_bit, dummy_night_bit)
                        .and(b.singleBit(b.day(area.name)))
                        .or(
                            expr
                                .drop_unless(dummy_night_bit, dummy_day_bit)
                                .and(b.singleBit(b.night(area.name)))
                        );
                } else if (rawArea.allowed_time_of_day === TimeOfDay.DayOnly) {
                    timed_req = expr
                        .drop_unless(dummy_day_bit, dummy_night_bit)
                        .and(b.singleBit(area.name));
                } else if (
                    rawArea.allowed_time_of_day === TimeOfDay.NightOnly
                ) {
                    timed_req = expr
                        .drop_unless(dummy_night_bit, dummy_day_bit)
                        .and(b.singleBit(area.name));
                } else {
                    throw new Error('bad ToD requirement');
                }
                b.addAlternative(locName, timed_req);
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

    // These validations aren't really needed for the tracker, but they were useful
    // when initially parsing the dump and they did catch some rando data bugs.
    // Ideally this could be uplifted into the tracker?
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

    // check for orphaned locations
    const mentionedBits = new Set(
        bitLogic.requirements.flatMap((expr) =>
            expr.conjunctions.flatMap((vec) => [...vec.iter()]),
        ),
    );

    for (const loc of nonCheckLocations) {
        if (!mentionedBits.has(b.bit(loc))) {
            console.warn('unused location', loc);
        }
    }

    const vanillaConnections: AreaGraph['vanillaConnections'] = {};
    for (const [exitId, exitDef] of Object.entries(raw.exits)) {
        if (exitDef.vanilla) {
            vanillaConnections[exitId] =
                entrancesByShortName[exitDef.vanilla].id;
        }
    }

    const autoExits: AreaGraph['autoExits'] = {};
    const entrancePools: AreaGraph['entrancePools'] = {
        dungeons: {},
        silent_realms: {},
    };

    for (const pool of ['silent_realms', 'dungeons'] as const) {
        const data = raw.linked_entrances[pool];
        for (const [location, entry] of Object.entries(data)) {
            if (typeof entry.exit_from_outside !== 'string') {
                autoExits[entry.exit_from_outside[0]] =
                    entry.exit_from_outside[1];
            }
            const canonicalExit =
                typeof entry.exit_from_outside === 'string'
                    ? entry.exit_from_outside
                    : entry.exit_from_outside[0];

            entrancePools[pool][location] = {
                entrances: [
                    vanillaConnections[canonicalExit],
                    vanillaConnections[entry.exit_from_inside],
                ],
                exits: [canonicalExit, entry.exit_from_inside],
            };
        }
    }

    const dungeonOrder: readonly string[] = dungeonNames;

    const rawCheckOrder = Object.keys(raw.checks);
    for (const area of Object.keys(checksByHintRegion)) {
        // TODO compareBy, sort in place
        checksByHintRegion[area] = _.sortBy(checksByHintRegion[area], (check) => {
            const idx = rawCheckOrder.indexOf(check);
            return idx !== -1 ? idx : Number.MAX_SAFE_INTEGER;
        });
    }

    const areas = _.sortBy(
        Object.keys(checksByHintRegion),
        (area) => dungeonOrder.indexOf(area),
        (area) => rawCheckOrder.indexOf(checksByHintRegion[area][0]),
    );

    // Some cheap optimizations - these have opaque entrances,
    // so not much opportunity here.
    do {
        removeDuplicates(bitLogic.requirements);
        while (shallowSimplify(opaqueItems, bitLogic.requirements)) {
            removeDuplicates(bitLogic.requirements);
        }
    } while (unifyRequirements(opaqueItems, bitLogic.requirements));

    // In theory, we could also do some more aggressive optimizations
    // with opaque entrances but we do have to be mindful of the size
    // of our resulting expressions, otherwise subsequent tooltip
    // calculations will be difficult to execute in a performant manner.
    // As it turns out, "just walking somewhere in-game" is a great way
    // to meet a lot of requirements when entrances are revealed, but with opaque
    // entrances, every entrance has to be considered uniquely reachable with no way
    // to bound our exploration or to simplify these expressions as we go.


    // Figure out which entrances can reach which exits and checks, this will be the data for
    // the check pathfinder that tells users how to get where with Entrance Rando on

    // to area -> from area
    const logicalEdges: Record<string, string[]> = {};
    for (const [areaName, area] of Object.entries(allAreas)) {
        for (const exit of area.exits) {
            if (exit.type === 'logicalExit') {
                (logicalEdges[exit.toArea] ??= []).push(areaName);
            }
        }
    }

    const seenAreas = new Set<string>();
    let numAreas = 0;
    for (const areaName of Object.keys(allAreas)) {
        if (seenAreas.has(areaName)) {
            continue;
        }
        numAreas += 1;
        const worklist = [areaName];

        while (worklist.length) {
            const consideredArea = worklist.pop()!;
            for (const parentArea of logicalEdges[consideredArea] ?? []) {
                if (!seenAreas.has(parentArea)) {
                    seenAreas.add(parentArea);
                    worklist.push(parentArea);
                }
            }
        }
    }

    console.log('numAreas', numAreas);



    for (const areaName of Object.keys(allAreas)) {
        const visitedAreas = new Set(areaName);
        const worklist = [areaName];
        const reachingExits: string[] = [];

        while (worklist.length) {
            const consideredArea = worklist.pop()!;
            reachingExits.push(...allAreas[consideredArea].entrances.filter((e) => raw.entrances[e]));
            for (const parentArea of logicalEdges[consideredArea] ?? []) {
                if (!visitedAreas.has(parentArea)) {
                    visitedAreas.add(parentArea);
                    worklist.push(parentArea);
                }
            }
        }

        const checks = checksByArea[areaName] ?? [];
        const exits = exitsByArea[areaName] ?? [];
        for (const location of checks.concat(exits)) {
            entrancesPerLocation[location] = reachingExits;
        }
    
    }

    console.log('logic building took', performance.now() - start, 'ms'); 

    return {
        bitLogic,
        allItems: rawItems,
        dominators,
        reverseDominators,
        itemBits,
        checks,
        areas,
        checksByHintRegion,
        exitsByHintRegion,
        dungeonCompletionRequirements: raw.dungeon_completion_requirements,
        areaGraph: {
            areas: allAreas,
            rootArea,
            areasByEntrance,
            areasByExit,
            entranceHintAreas,
            entrancesPerLocation,
            entrances: raw.entrances,
            exits: raw.exits,
            vanillaConnections,
            autoExits,
            entrancePools,
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
    } else if (checkType.includes('Beedle') && checkType.includes('Shop Purchases')) {
        return 'beedle_shop';
    } else if (checkType.includes('Gear Shop Purchases')) {
        return 'gear_shop';
    } else if (checkType.includes('Potion Shop Purchases')) {
        return 'potion_shop';
    } else if (
        checkType.includes('Tadtones') &&
        !checkName.includes('Water Dragon\'s Reward')
    ) {
        return 'tadtone';
    } else {
        return 'regular';
    }
}
