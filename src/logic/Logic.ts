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

export type ExtendedTimeOfDay = TimeOfDay | 'abstract';

/**
 * The AreaGraph is a parsed dump with some preprocessing for TimeOfDay logic.
 * This graph will be mapped to a self-contained BitLogic for logical state.
 * The BitLogic results can the be used to interpret edges in this graph.
 * 
 * This area graph maintains the structure of the area requirements, which could help
 * implementing a more structured grounding algorithm for tooltip requirements in the future.
 */
export interface AreaGraph {
    rootArea: Area;
    areas: Record<string, Area>;
    areasByEntrance: Record<string, Area>;
    areasByExit: Record<string, Area>;
    vanillaConnections: { [from: string]: string };
    entrances: Record<string, RawEntrance>;
    entranceHintAreas: Record<string, string>;
    exits: Record<string, RawExit>;

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

export type DayNightRequirements = { day: LogicalExpression, night: LogicalExpression };

interface CommonArea {
    abstract: boolean;
    id: string;
    subAreas: Record<string, Area>;
    allowedTimeOfDay: ExtendedTimeOfDay;
    canSleep: boolean;
    /** The possible ways to get into this area, an entry in Logic.entrances */
    entrances: string[];
}

/**
 * An area where both day and night are logically allowed. Exits and checks
 * have separate requirements for the day and the night state.
 * The actual area name doesn't exist in logic, instead we have _DAY and _NIGHT versions.
 */
export interface DualTodArea extends CommonArea {
    allowedTimeOfDay: TimeOfDay.Both;
    locations: Location<DayNightRequirements, TimeOfDay.Both>[];
    abstract: false;
}

/**
 * An area where either only day or only night are logically allowed.
 * Exits and checks have a single expression that is calculated
 * assuming you are in this area with the allowed ToD. Getting there
 * with the opposite ToD is an immediate out-of-logic.
 */
export interface SingleTodArea extends CommonArea {
    allowedTimeOfDay: TimeOfDay.DayOnly | TimeOfDay.NightOnly;
    locations: Location<LogicalExpression, TimeOfDay.DayOnly | TimeOfDay.NightOnly>[];
    canSleep: false;
    abstract: false;
}

/**
 * An area where either only day or only night are logically allowed.
 * Exits and checks have a single expression that is calculated
 * assuming you are in this area with the allowed ToD. Getting there
 * with the opposite ToD is an immediate out-of-logic.
 */
export interface AbstractArea extends CommonArea {
    allowedTimeOfDay: 'abstract';
    locations: Location<LogicalExpression, 'abstract'>[];
    canSleep: false;
    abstract: true;
}

export type Area = DualTodArea | SingleTodArea | AbstractArea;

/** A single logical location. Can be an actual check, an arbitrary "location", a map exit, or a logical exit. */
interface AbstractLocation<R, T extends ExtendedTimeOfDay> {
    /** The fully resolved check/exit/location id. */
    id: string;
    /** The actual requirements expression(s) to get this location... */
    requirements: R,
    /** ...from its owning area with this Time of Day. */
    areaTimeOfDay: T;
}

interface MapExit<R, T extends ExtendedTimeOfDay> extends AbstractLocation<R, T> {
    type: 'mapExit';
}

interface LogicalExit<R, T extends ExtendedTimeOfDay> extends AbstractLocation<R, T> {
    type: 'logicalExit';
    /** The destination area. */
    toArea: string;
}

interface VirtualLocation<R, T extends ExtendedTimeOfDay> extends AbstractLocation<R, T> {
    type: 'virtualLocation';
}

interface CheckRenameMe<R, T extends ExtendedTimeOfDay> extends AbstractLocation<R, T> {
    type: 'check';
    /** Whether this instance of the location was the primary (unprefixed) mention. */
    isPrimaryLocation: boolean;
}

type Location<R, T extends ExtendedTimeOfDay> = MapExit<R, T> | LogicalExit<R, T> | VirtualLocation<R, T> | CheckRenameMe<R, T>;


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
    // const areaByLocation: AreaGraph['areaByLocation'] = {};

    const entrancesByShortName: {
        [shortName: string]: { def: RawEntrance; id: string, region: string };
    } = {};
    let idx = 0;
    for (const rawItem of rawItems) {
        itemBits[rawItem] = idx;
        idx++;
    }

    const dummyDayBit = itemBits['Day'];
    const dummyNightBit = itemBits['Night'];
    opaqueItems.clearBit(dummyDayBit);
    opaqueItems.clearBit(dummyNightBit);

    const allAreas: AreaGraph['areas'] = {};

    const parseExpr = (expr: string) => {
        return new LogicalExpression(
            booleanExprToLogicalExpr(
                bitLogic.numBits,
                parseExpression(expr),
                (item: string) => itemBits[item],
            ),
        );
    };

    // Locations found in areas where we didn't find a corresponding check.
    // We better mention this "virtual" check in some other requirement.
    const nonCheckLocations = new Set<string>();

    function createAreaIndex(rawArea: RawArea) {
        let area: Area;
        if (rawArea.abstract) {
            if (rawArea.can_sleep) {
                throw new Error(`cannot sleep in ${rawArea.name}`);
            }
            area = {
                abstract: rawArea.abstract,
                id: rawArea.name,
                allowedTimeOfDay: 'abstract',
                canSleep: rawArea.can_sleep,
                locations: [],
                entrances: [],
                subAreas: {},
            } satisfies AbstractArea;
        } else if (rawArea.allowed_time_of_day === TimeOfDay.Both) {
            area = {
                abstract: rawArea.abstract,
                id: rawArea.name,
                allowedTimeOfDay: rawArea.allowed_time_of_day,
                canSleep: rawArea.can_sleep,
                locations: [],
                entrances: [],
                subAreas: {},
            } satisfies DualTodArea;
        } else {
            if (rawArea.can_sleep) {
                throw new Error(`cannot sleep in ${rawArea.name}`);
            }
            area = {
                abstract: rawArea.abstract,
                id: rawArea.name,
                allowedTimeOfDay: rawArea.allowed_time_of_day,
                canSleep: rawArea.can_sleep,
                locations: [],
                entrances: [],
                subAreas: {},
            } satisfies SingleTodArea;
        }
        allAreas[area.id] = area;
        if (!_.isEmpty(rawArea.sub_areas)) {
            for (const rawSubArea of Object.values(rawArea.sub_areas)) {
                const subArea = createAreaIndex(rawSubArea);
                area.subAreas[rawSubArea.name] = subArea;
            }
        }

        return area;
    }

    function toSingleTodExpr(
        tod: TimeOfDay.DayOnly | TimeOfDay.NightOnly | 'abstract',
        expr: LogicalExpression,
    ): LogicalExpression {
        if (tod === 'abstract') {
            return expr;
        } else if (tod === TimeOfDay.DayOnly) {
            return expr.drop_unless(dummyDayBit, dummyNightBit);
        } else {
            return expr.drop_unless(dummyNightBit, dummyDayBit);
        }
    }

    function toDualTodExpr(
        _tod: TimeOfDay.Both,
        expr: LogicalExpression,
    ): DayNightRequirements {
        return {
            day: expr.drop_unless(dummyDayBit, dummyNightBit),
            night: expr.drop_unless(dummyNightBit, dummyDayBit),
        };
    }

    function populateArea(rawArea: RawArea): Area {
        const area = allAreas[rawArea.name];
        if (!_.isEmpty(rawArea.sub_areas)) {
            for (const rawSubArea of Object.values(rawArea.sub_areas)) {
                populateArea(rawSubArea);
            }
        }

        const getHintRegion = (locationId: string) => {
            let region: string | null | undefined =
                rawArea.hint_region;
            if (
                !region &&
                (locationId.includes('Temple of Time') ||
                    locationId.includes('Goddess Cube at Ride') ||
                    locationId.includes('Gossip Stone in Temple of Time Area'))
            ) {
                // FIXME fix the data
                region = 'Lanayru Desert';
            }
            if (!region) {
                throw new Error(`check ${locationId} has no region?`);
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
                    if (area.abstract) {
                        throw new Error('abstract area cannot have map exits');
                    }
                    if (area.allowedTimeOfDay === TimeOfDay.Both) {
                        area.locations.push({
                            type: 'logicalExit',
                            id: fullExitName,
                            toArea: destArea.id,
                            requirements: toDualTodExpr(area.allowedTimeOfDay, expr),
                            areaTimeOfDay: area.allowedTimeOfDay,
                        });
                    } else {
                        area.locations.push({
                            type: 'logicalExit',
                            id: fullExitName,
                            toArea: destArea.id,
                            requirements: toSingleTodExpr(area.allowedTimeOfDay, expr),
                            areaTimeOfDay: area.allowedTimeOfDay,
                        });
                    }
                } else if (raw.exits[fullExitName]) {
                    // map exit
                    areasByExit[fullExitName] = area;

                    if (area.abstract) {
                        if (fullExitName !== '\\Start') {
                            throw new Error('abstract area may only lead to start exit');
                        }
                        area.locations.push({
                            type: 'mapExit',
                            id: fullExitName,
                            requirements: expr,
                            areaTimeOfDay: 'abstract',
                        });
                    } else if (area.allowedTimeOfDay === TimeOfDay.Both) {
                        area.locations.push({
                            type: 'mapExit',
                            id: fullExitName,
                            requirements: toDualTodExpr(area.allowedTimeOfDay, expr),
                            areaTimeOfDay: area.allowedTimeOfDay,
                        });
                    } else {
                        area.locations.push({
                            type: 'mapExit',
                            id: fullExitName,
                            requirements: toSingleTodExpr(area.allowedTimeOfDay, expr),
                            areaTimeOfDay: area.allowedTimeOfDay,
                        });
                    }

                    if (area.abstract) {
                        if (fullExitName !== '\\Start') {
                            throw new Error(
                                'abstract area can only exit to start',
                            );
                        }
                    } else {
                        const region = getHintRegion(fullExitName);
                        (exitsByHintRegion[region] ??= []).push(fullExitName);
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

                const entranceId = `${rawArea.name}\\${entrance}`;
                const entranceDef = raw.entrances[entranceId];

                const region = getHintRegion(entranceId);
                entranceHintAreas[entranceId] = region;

                // Are both of these needed???

                entrancesByShortName[entranceDef.short_name] = {
                    def: entranceDef,
                    id: entranceId,
                    region,
                };

                entrancesByShortName[entrance] = {
                    def: entranceDef,
                    id: entranceId,
                    region,
                };
            }
        }

        if (rawArea.locations) {
            for (const [
                location,
                locationRequirementExpression,
            ] of Object.entries(rawArea.locations)) {
                const locationId = location.startsWith('\\')
                    ? location
                    : `${area.id}\\${location}`;

                const expr = parseExpr(locationRequirementExpression);

                const check: LogicalCheck | undefined = checks[locationId];
                const isPrimaryLocation = check && !location.startsWith('\\');
                if (check) {
                    if (isPrimaryLocation) {
                        const region = getHintRegion(locationId);
                        if (check.type === 'tr_cube') {
                            check.name = `${region} - ${check.name}`;
                        }
                        // areaByLocation[locName] = area.name;
                        (checksByHintRegion[region] ??= []).push(locationId);
                    }
                } else {
                    nonCheckLocations.add(locationId);
                }

                if (area.abstract) {
                    if (check) {
                        throw new Error('abstract location cannot own a check');
                    }
                    area.locations.push({
                        type: 'virtualLocation',
                        id: locationId,
                        requirements: expr,
                        areaTimeOfDay: 'abstract',
                    });
                } else if (area.allowedTimeOfDay === TimeOfDay.Both) {
                    area.locations.push({
                        type: check ? 'check' : 'virtualLocation',
                        id: locationId,
                        isPrimaryLocation,
                        requirements: toDualTodExpr(area.allowedTimeOfDay, expr),
                        areaTimeOfDay: area.allowedTimeOfDay,
                    });
                } else {
                    area.locations.push({
                        type: check ? 'check' : 'virtualLocation',
                        id: locationId,
                        isPrimaryLocation,
                        requirements: toSingleTodExpr(area.allowedTimeOfDay, expr),
                        areaTimeOfDay: area.allowedTimeOfDay,
                    });
                }
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
        for (const location of area.locations) {
            switch (location.type) {
                case 'logicalExit': {
                    const targetArea = allAreas[location.toArea];
                    if (!targetArea) {
                        throw new Error(
                            `${area.id} -> exit to area ${location.toArea} does not exist`,
                        );
                    } else if (targetArea.abstract) {
                        throw new Error(
                            `${area.id} -> exit to area ${location.toArea} leads to abstract area`,
                        );
                    }
                    break;
                }
                case 'mapExit': {
                    const connector = raw.exits[location.id];
                    if (!connector) {
                        throw new Error(
                            `exit to connector ${location.id} does not exist`,
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


    const areaGraph: AreaGraph = {
        areas: allAreas,
        rootArea,
        areasByEntrance,
        areasByExit,
        entranceHintAreas,
        // logicalExitsToArea,
        // mapExitRequirements,
        // areaByLocation,
        entrances: raw.entrances,
        exits: raw.exits,
        vanillaConnections,
        autoExits,
        entrancePools,
    };

    // Now map our area graph to BitLogic
    const newBuilder = new LogicBuilder(bitLogic, rawItems, bitLogic.requirements);
    mapAreaToBitLogic(newBuilder, areaGraph, opaqueItems);
    

    // check for orphaned locations
    const mentionedBits = new Set(
        bitLogic.requirements.flatMap((expr) =>
            expr.conjunctions.flatMap((vec) => [...vec.iter()]),
        ),
    );

    for (const loc of nonCheckLocations) {
        if (!mentionedBits.has(itemBits[loc])) {
            console.warn('unused location', loc);
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
        areaGraph,
    };
}

function mapAreaToBitLogic(
    b: LogicBuilder,
    areaGraph: AreaGraph,
    opaqueItems: BitVector,
    area = areaGraph.rootArea,
) {
    for (const subArea of Object.values(area.subAreas)) {
        mapAreaToBitLogic(b, areaGraph, opaqueItems, subArea);
    }

    if (area.canSleep) {
        b.addAlternative(b.day(area.id), b.singleBit(b.night(area.id)));
        b.addAlternative(b.night(area.id), b.singleBit(b.day(area.id)));
    }

    for (const location of area.locations) {
        switch (location.type) {
            case 'check':
            case 'virtualLocation':
            case 'mapExit':
                {
                    // Special case: If this is a cube check, we actually build
                    // logic for the fake "can access cube" requirement.
                    let locName = location.id;
                    if (cubeCheckToCanAccessCube[locName]) {
                        locName = cubeCheckToCanAccessCube[locName];
                    }

                    opaqueItems.clearBit(b.bit(locName));

                    if (location.areaTimeOfDay === 'abstract') {
                        b.addAlternative(locName, location.requirements);
                    } else if (location.areaTimeOfDay === TimeOfDay.Both) {
                        b.addAlternative(
                            locName,
                            location.requirements.day.and(
                                b.singleBit(b.day(area.id)),
                            ),
                        );
                        b.addAlternative(
                            locName,
                            location.requirements.night.and(
                                b.singleBit(b.night(area.id)),
                            ),
                        );
                    } else {
                        b.addAlternative(
                            locName,
                            location.requirements.and(b.singleBit(area.id)),
                        );
                    }
                }
                break;
            case 'logicalExit':
                {
                    const destArea = areaGraph.areas[location.toArea];
                    if (destArea.abstract || location.areaTimeOfDay === 'abstract') {
                        throw new Error('abstract areas cannot have logical exits between them');
                    }
                    if (destArea.allowedTimeOfDay === TimeOfDay.Both) {
                        opaqueItems.clearBit(b.bit(b.day(destArea.id)));
                        opaqueItems.clearBit(b.bit(b.night(destArea.id)));
        
                        if (location.areaTimeOfDay === TimeOfDay.Both) {
                            b.addAlternative(
                                b.day(destArea.id),
                                location.requirements.day.and(
                                    b.singleBit(b.day(area.id)),
                                ),
                            );
                            b.addAlternative(
                                b.night(destArea.id),
                                location.requirements.night.and(
                                    b.singleBit(b.night(area.id)),
                                ),
                            );
                        } else if (location.areaTimeOfDay === TimeOfDay.DayOnly) {
                            b.addAlternative(b.day(destArea.id), location.requirements.and(
                                b.singleBit(area.id),
                            ));
                        } else {
                            b.addAlternative(b.night(destArea.id), location.requirements.and(
                                b.singleBit(area.id),
                            ));
                        }
                    } else {
                        opaqueItems.clearBit(b.bit(destArea.id));
        
                        if (location.areaTimeOfDay === TimeOfDay.Both) {
                            const [timedReq, timedArea] =
                                destArea.allowedTimeOfDay === TimeOfDay.DayOnly
                                    ? [location.requirements.day, b.day(area.id)]
                                    : [location.requirements.night, b.night(area.id)];
                            b.addAlternative(
                                destArea.id,
                                timedReq.and(b.singleBit(timedArea)),
                            );
                        } else if (location.areaTimeOfDay === destArea.allowedTimeOfDay) {
                            b.addAlternative(
                                destArea.id,
                                location.requirements.and(b.singleBit(area.id)),
                            );
                        } else {
                            throw new Error('impossible logical connection');
                        }
                    }
                }
                break;
        }
    }

    for (const entrance of area.entrances) {
        const entranceDef = areaGraph.entrances[entrance];
        if (entranceDef.allowed_time_of_day === TimeOfDay.Both) {
            b.addAlternative(b.day(area.id), b.singleBit(b.day(entrance)));
            b.addAlternative(b.night(area.id), b.singleBit(b.night(entrance)));
            opaqueItems.clearBit(b.bit(b.day(area.id)));
            opaqueItems.clearBit(b.bit(b.night(area.id)));
        } else {
            let areaReq: string;
            if (area.allowedTimeOfDay === TimeOfDay.Both) {
                if (
                    entranceDef.allowed_time_of_day ===
                    TimeOfDay.DayOnly
                ) {
                    areaReq = b.day(area.id);
                } else if (
                    entranceDef.allowed_time_of_day ===
                    TimeOfDay.NightOnly
                ) {
                    areaReq = b.night(area.id);
                } else {
                    throw new Error('bad ToD requirement');
                }
            } else {
                areaReq = area.id;
            }
            b.addAlternative(areaReq, b.singleBit(entrance));
            opaqueItems.clearBit(b.bit(areaReq));
        }
    }
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
