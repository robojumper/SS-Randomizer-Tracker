import { groupBy, invert, last } from 'es-toolkit';
import { isEmpty } from '../../utils/Collections';
import { chainComparators, compareBy } from '../../utils/Compare';
import { appWarn } from '../../utils/Debug';
import {
    booleanExprToRequirementExpr,
    parseExpression,
} from '../booleanlogic/ExpressionParse';
import { isItem } from '../Inventory';
import { dungeonNames } from '../Locations';
import type { EntranceLinkage } from '../Logic';
import { TimeOfDay } from '../Mappers';
import {
    bannedExitsAndEntrances,
    impaSongCheck,
    nonRandomizedEntrances,
    runtimeOptions,
    wellKnownRequirements,
} from '../ThingsThatWouldBeNiceToHaveInTheDump';
import {
    cubeCheckToCubeCollected,
    cubeCollectedToCubeCheck,
    dungeonCompletionItems,
    impaSongEvent,
    sothItems,
    triforceItems,
} from '../TrackerModifications';
import type { RawArea, RawEntrance, RawLogic } from '../UpstreamTypes';
import type { Area2 } from './Area';
import type { Entrance2, Exit2 } from './Entrance';
import { getLocationType, type Event2, type Location2 } from './Location';
import type { FullRequirement2, Requirement2 } from './Requirement';

/**
 * Assigns checks and exits to hint regions. This is something
 * that currently happens statically, but e.g. SSHDR reassigns
 * them based on "sub-areas" when ER features are enabled, so
 * at least use a separate data structure for now.
 */
export interface HintRegionLookup2 {
    hintRegions: string[];
    /** hint region -> check[] */
    checksByHintRegion: Record<string, string[]>;
    /** check -> hint region */
    checkHintRegions: Record<string, string>;
    /** hint region -> exit[] */
    exitsByHintRegion: Record<string, string[]>;
    /** entrance -> hint region */
    entranceHintRegions: Record<string, string>;
}

export interface LogicAuxData2 {
    dungeonCompletionRequirements: { [dungeon: string]: string };

    /** Sandship Dock Exit -> Exit to Sandship */
    autoExits: {
        [canonicalExit: string]: string;
    };
    /**
     * Linked entrance pools are Dungeons and Silent Realms,
     * where interior exits follow exterior exit choice.
     */
    linkedEntrancePools: {
        [key in keyof RawLogic['linked_entrances']]: Record<
            string,
            EntranceLinkage
        >;
    };
    /**
     * An entrance pool without linkage.
     */
    birdStatueSanity: {
        [pool: string]: { exit: string; entrances: string[] };
    };
}

export interface Logic2<R = Requirement2> {
    areas: Record<string, Area2>;
    exits: Record<string, Exit2>;
    entrances: Record<string, Entrance2>;
    locations: Record<string, Location2>;
    events: Record<string, Event2>;
    auxData: LogicAuxData2;
    hintRegions: HintRegionLookup2;
    /**
     * A requirements side table. Everything with access rules will
     * have an index referring to an entry here, since we need to change
     * some requirements after parsing due to settings and required dungeons.
     */
    requirements: R[];
}

export type PreSettingsLogic2 = Logic2<FullRequirement2>;
export type PostSettingsLogic2 = Logic2<Requirement2>;

export function parseLogic2(raw: RawLogic): PreSettingsLogic2 {
    const locations: PreSettingsLogic2['locations'] = {};
    const exits: PreSettingsLogic2['exits'] = {};
    const entrances: PreSettingsLogic2['entrances'] = {};
    const auxItems: Set<string> = new Set();
    let requirementsIdx = 0;
    const requirements: Record<number, FullRequirement2> = {};

    const dungeonCompletionRequirements = invert<string, string>(
        raw.dungeon_completion_requirements,
    );

    for (const item of Object.values(dungeonCompletionRequirements)) {
        auxItems.add(item);
    }

    for (const item of triforceItems) {
        auxItems.add(item);
    }

    for (const item of sothItems) {
        auxItems.add(item);
    }

    for (const [checkId, check] of Object.entries(raw.checks)) {
        const type = getLocationType(check.short_name, check.type);
        const dungeon = dungeonCompletionRequirements[checkId];
        const containedAuxItem = dungeon
            ? dungeonCompletionItems[dungeon]
            : type === 'loose_crystal'
              ? 'Gratitude Crystal'
              : undefined;
        locations[checkId] = {
            id: checkId,
            name: check.short_name,
            originalItem: splitItemIndex(check['original item'])[0],
            type,
            containedAuxItem,
        };
    }

    for (const [entranceId, entrance] of Object.entries(raw.entrances)) {
        entrances[entranceId] = {
            id: entranceId,
            name: entrance.short_name,
            allowedTimeOfDay: entrance.allowed_time_of_day,
            canStartAt: entrance['can-start-at'] ?? true,
            province: entrance.province,
            isBirdStatueEntrance: entrance.subtype === 'bird-statue-entrance',
            excludedFromFullEr:
                bannedExitsAndEntrances.includes(entranceId) ||
                entrance.stage === undefined ||
                nonRandomizedEntrances.includes(entranceId),
            // Filled in later
            parentArea: '',
        };
    }

    for (const [exitId, exit] of Object.entries(raw.exits)) {
        exits[exitId] = {
            id: exitId,
            name: exit.short_name,
            requirementsIdx: requirementsIdx++,
            vanillaConnection: exit.vanilla,
            excludedFromFullEr:
                exit.stage === undefined ||
                exit.vanilla === undefined ||
                exitId.includes('Pillar'),
            // Filled in later
            parentArea: '',
        };
    }

    for (const [cubeItem, cubeCheck] of Object.entries(
        cubeCollectedToCubeCheck,
    )) {
        locations[cubeCheck] = {
            id: cubeCheck,
            type: 'tr_cube',
            name: last(cubeCheck.split('\\'))!,
            originalItem: undefined,
            containedAuxItem: cubeItem,
        };
        auxItems.add(cubeItem);
    }

    for (const [gossipStoneId, gossipStoneName] of Object.entries(
        raw.gossip_stones,
    )) {
        locations[gossipStoneId] = {
            id: gossipStoneId,
            type: 'gossip_stone',
            name: gossipStoneName,
            originalItem: undefined,
            containedAuxItem: undefined,
        };
    }

    // Implicitly created during this parsing step
    const events: PreSettingsLogic2['events'] = {};
    const areas: PreSettingsLogic2['areas'] = {};
    const hintRegionData: PreSettingsLogic2['hintRegions'] = {
        checksByHintRegion: {},
        checkHintRegions: {},
        entranceHintRegions: {},
        exitsByHintRegion: {},
        hintRegions: [],
    };

    const entrancesByShortName: {
        [shortName: string]: { def: RawEntrance; id: string };
    } = {};

    function createAreaIndex(rawArea: RawArea) {
        if (rawArea.abstract && rawArea.can_sleep) {
            throw new Error(`cannot sleep in ${rawArea.name}`);
        }
        if (
            rawArea.allowed_time_of_day !== TimeOfDay.Both &&
            rawArea.can_sleep
        ) {
            throw new Error(`cannot sleep in ${rawArea.name}`);
        }

        const area: Area2 = {
            id: rawArea.name,
            abstract: rawArea.abstract,
            allowedTimeOfDay: rawArea.allowed_time_of_day,
            canSleep: rawArea.can_sleep,
            locations: [],
            entrances: [],
            exits: [],
            logicalExits: [],
            events: [],
            subAreas: {},
        };

        areas[area.id] = area;
        if (!isEmpty(rawArea.sub_areas)) {
            for (const rawSubArea of Object.values(rawArea.sub_areas)) {
                const subArea = createAreaIndex(rawSubArea);
                area.subAreas[rawSubArea.name] = subArea;
            }
        }

        return area;
    }

    const knownSettings = runtimeOptions.map((o) => o[0]);
    const parseExpr = (expr: string) => {
        return booleanExprToRequirementExpr(
            parseExpression(expr),
            (item: string): FullRequirement2 => {
                if (locations[item]) {
                    // check whether a check is mentioned by requirements.
                    // This should not be a thing because it means that the location
                    // cannot be banned. Again something the rando should enforce...
                    appWarn(
                        'check location',
                        locations[item].name,
                        'is mentioned by a requirement, which makes it unbannable',
                    );
                    const fakeAuxItem = `FAKE_ITEM_FIX_THE_DATA-${item}`;
                    locations[item].containedAuxItem = fakeAuxItem;
                    return { type: 'auxItem', name: fakeAuxItem };
                }

                if (auxItems.has(item)) {
                    return { type: 'auxItem', name: item };
                }

                if (item in wellKnownRequirements) {
                    return {
                        type: 'wellKnown',
                        name: wellKnownRequirements[item],
                    };
                }

                if (item === 'Day') {
                    return { type: 'timeOfDay', tod: TimeOfDay.DayOnly };
                }
                if (item === 'Night') {
                    return { type: 'timeOfDay', tod: TimeOfDay.NightOnly };
                }

                const [inventoryItem, count] = splitItemCount(item);
                if (isItem(inventoryItem)) {
                    return {
                        type: 'item',
                        name: inventoryItem,
                        count: count ?? 1,
                    };
                }

                if (item.endsWith(' Trick')) {
                    return {
                        type: 'trick',
                        name: item.slice(0, -' Trick'.length),
                        isCustomizationTrick: false,
                    };
                }

                if (knownSettings.includes(item)) {
                    return { type: 'setting', name: item };
                }

                // If an expression looks at "goddess cube in X", require the actual item instead.
                const goddessCubeItem = cubeCheckToCubeCollected[item];
                if (goddessCubeItem) {
                    return { type: 'auxItem', name: inventoryItem };
                }

                if (/\\[0-9]+ Gratitude Crystals/.exec(item)) {
                    return {
                        type: 'gratitudeCrystals',
                        amount: parseInt(item.split(' ')[0].slice(1), 10),
                    };
                }

                return { type: 'event', id: item };
            },
        );
    };

    /**
     * Recursively populate the area graph.
     */
    function populateArea(rawArea: RawArea): Area2 {
        const area = areas[rawArea.name];
        if (!isEmpty(rawArea.sub_areas)) {
            for (const rawSubArea of Object.values(rawArea.sub_areas)) {
                populateArea(rawSubArea);
            }
        }

        const getHintRegion = (locationId: string) => {
            let region: string | null | undefined = rawArea.hint_region;
            if (
                !region &&
                (locationId.includes('Temple of Time') ||
                    locationId.includes('Goddess Cube at Ride') ||
                    locationId.includes('Gossip Stone in Temple of Time Area'))
            ) {
                // The data has been fixed but we support old versions
                region = 'Lanayru Desert';
            }

            if (
                region === 'Eldin Volcano' &&
                (locationId.includes('Gossip Stone in Upper Platform Cave') ||
                    locationId.includes('Gossip Stone in Lower Platform Cave'))
            ) {
                // TODO discuss changing the upstream data
                region = 'Bokoblin Base';
            }

            if (!region) {
                throw new Error(`check ${locationId} has no region?`);
            }
            return region;
        };

        if (rawArea.exits) {
            for (const [exit, exitRequirementExpression] of Object.entries(
                rawArea.exits,
            )) {
                const expr = parseExpr(exitRequirementExpression);
                const fullExitName = exit.startsWith('\\')
                    ? exit
                    : `${rawArea.name}\\${exit}`;
                if (areas[fullExitName]) {
                    // logical exit
                    const destArea = areas[fullExitName];
                    if (area.abstract) {
                        throw new Error(
                            'abstract area cannot have logical exits',
                        );
                    }
                    requirements[requirementsIdx] = expr;
                    area.logicalExits.push({
                        connectedArea: destArea.id,
                        parentArea: area.id,
                        requirementsIdx: requirementsIdx++,
                    });
                } else if (exits[fullExitName]) {
                    // map exit
                    const exitDef = exits[fullExitName];
                    requirements[exitDef.requirementsIdx] = expr;
                    exitDef.parentArea = area.id;
                    area.exits.push(exitDef);

                    if (area.abstract && fullExitName !== '\\Start') {
                        throw new Error(
                            'abstract area may only lead to start exit',
                        );
                    }

                    if (!area.abstract) {
                        const region = getHintRegion(fullExitName);
                        (hintRegionData.exitsByHintRegion[region] ??= []).push(
                            fullExitName,
                        );
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
                entrances[entranceId].parentArea = area.id;

                // Are both of these needed???
                entrancesByShortName[entranceDef.short_name] = {
                    def: entranceDef,
                    id: entranceId,
                };

                entrancesByShortName[entrance] = {
                    def: entranceDef,
                    id: entranceId,
                };

                const region = getHintRegion(entranceId);
                hintRegionData.entranceHintRegions[entranceId] = region;
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

                const check: Location2 | undefined = locations[locationId];
                const isPrimaryLocation = check && !location.startsWith('\\');
                if (check) {
                    if (isPrimaryLocation) {
                        const region = getHintRegion(locationId);
                        /*
                        if (check.type === 'tr_cube') {
                            check.name = `${region} - ${check.name}`;
                        }
                        check.area = region;
                        */
                        (hintRegionData.checksByHintRegion[region] ??= []).push(
                            locationId,
                        );
                        hintRegionData.checkHintRegions[locationId] = region;
                    }
                }

                requirements[requirementsIdx] = expr;
                if (check) {
                    area.locations.push({
                        isPrimaryAccess: isPrimaryLocation,
                        locationId,
                        parentArea: area.id,
                        requirementsIdx: requirementsIdx++,
                    });
                } else {
                    if (isPrimaryLocation) {
                        events[locationId] = {
                            id: locationId,
                        };
                    }
                    area.events.push({
                        eventId: locationId,
                        parentArea: area.id,
                        requirementsIdx: requirementsIdx++,
                    });
                }
            }
        }

        // The rando can cause game completion to rely on a check
        // as a requirement, which is a bad idea because it makes
        // checks unbannable and it's also incompatible
        // with the tracker's logic framework, so we need to make
        // up an event.
        if (area.id === '\\Faron\\Sealed Grounds\\Sealed Temple') {
            const impaSongItem = area.locations.find(
                (l) => l.locationId === impaSongCheck,
            )!;
            area.events.push({
                eventId: impaSongEvent,
                parentArea: area.id,
                requirementsIdx: impaSongItem.requirementsIdx,
            });
        }

        return area;
    }

    createAreaIndex(raw.areas);
    const rootArea = populateArea(raw.areas);
    if (!rootArea.abstract) {
        throw new Error('rootArea must be abstract');
    }

    for (const [exitId, exitDef] of Object.entries(raw.exits)) {
        if (exitDef.vanilla) {
            exits[exitId].vanillaConnection =
                entrancesByShortName[exitDef.vanilla].id;
        }
    }

    const autoExits: LogicAuxData2['autoExits'] = {};
    const linkedEntrancePools: LogicAuxData2['linkedEntrancePools'] = {
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

            linkedEntrancePools[pool][location] = {
                entrances: [
                    exits[canonicalExit].vanillaConnection!,
                    exits[entry.exit_from_inside].vanillaConnection!,
                ],
                exits: [canonicalExit, entry.exit_from_inside],
            };
        }
    }

    const birdStatueSanity: LogicAuxData2['birdStatueSanity'] = {};
    const raiseMissingProvince = (entrance: RawEntrance) => {
        throw new Error(
            `bird statue entrance ${entrance.short_name} is missing a province`,
        );
    };
    const allBirdStatues = groupBy(
        Object.entries(raw.entrances).filter(
            ([, entrance]) =>
                entrance.subtype === 'bird-statue-entrance' &&
                !entrance.short_name.includes('Fire Sanctuary'),
        ),
        ([, entrance]) => entrance.province ?? raiseMissingProvince(entrance),
    );

    for (const [exitId, exitDef] of Object.entries(raw.exits)) {
        const province = exitDef['pillar-province'];
        if (province) {
            birdStatueSanity[province] = {
                exit: exitId,
                entrances: allBirdStatues[province].map(
                    (e) => entrancesByShortName[e[1].short_name].id,
                ),
            };
        }
    }

    const arrRequirements: FullRequirement2[] = [];
    for (let i = 0; i < requirementsIdx; i++) {
        if (requirements[i] === undefined) {
            throw new Error('hole in requirements');
        }
        arrRequirements.push(requirements[i]);
    }

    const rawCheckOrder = Object.keys(raw.checks);
    for (const region of Object.keys(hintRegionData.checksByHintRegion)) {
        hintRegionData.checksByHintRegion[region].sort(
            compareBy((check) => {
                const idx = rawCheckOrder.indexOf(check);
                return idx !== -1 ? idx : Number.MAX_SAFE_INTEGER;
            }),
        );
    }

    const hintRegions = Object.keys(hintRegionData.checksByHintRegion);
    const dungeonOrder: readonly string[] = dungeonNames;
    hintRegions.sort(
        chainComparators(
            compareBy((area) => dungeonOrder.indexOf(area)),
            compareBy((area) =>
                rawCheckOrder.indexOf(
                    hintRegionData.checksByHintRegion[area][0],
                ),
            ),
        ),
    );

    hintRegionData.hintRegions = hintRegions;

    return {
        areas,
        entrances,
        events,
        exits,
        locations,
        requirements: arrRequirements,
        auxData: {
            autoExits,
            birdStatueSanity,
            dungeonCompletionRequirements,
            linkedEntrancePools,
        },
        hintRegions: hintRegionData,
    };
}

const itemIndexPat = /^(.+) #(\d+)$/;

function splitItemIndex(
    item: string,
): [item: string, index: number | undefined] {
    const match = item.match(itemIndexPat);
    if (!match) {
        return [item, undefined];
    } else {
        return [match[1], parseInt(match[2], 10)];
    }
}

const itemCountPat = /^(.+) x (\d+)$/;

function splitItemCount(
    item: string,
): [item: string, index: number | undefined] {
    const match = item.match(itemCountPat);
    if (!match) {
        return [item, undefined];
    } else {
        return [match[1], parseInt(match[2], 10)];
    }
}
