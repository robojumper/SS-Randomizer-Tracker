import _ from 'lodash';
import { OptionDefs, TypedOptions } from '../permalink/SettingsTypes';
import { BitVector } from '../bitlogic/BitVector';
import { RegularDungeon } from './DerivedState';
import { LogicalExpression } from '../bitlogic/LogicalExpression';
import { Logic, makeDay, makeNight } from '../logic/Logic';
import { cubeCheckToCanAccessCube, requiredDungeonsCompletedFakeRequirement, sothItemReplacement, sothItems, triforceItemReplacement, triforceItems } from './TrackerModifications';
import { TimeOfDay } from './UpstreamTypes';
import { completeTriforceReq, dungeonCompletionRequirements, gotOpeningReq, gotRaisingReq, hordeDoorReq, impaSongCheck, runtimeOptions, swordsToAdd } from './ThingsThatWouldBeNiceToHaveInTheDump';

export const itemMaxes = {
    'Progressive Sword': 6,
    'Progressive Wallet': 4,
    'Extra Wallet': 3,
    'Progressive Mitts': 2,
    "Water Dragon's Scale": 1,
    'Fireshield Earrings': 1,
    "Goddess's Harp": 1,
    "Farore's Courage": 1,
    "Nayru's Wisdom": 1,
    "Din's Power": 1,
    'Ballad of the Goddess': 1,
    'Song of the Hero': 3,
    Sailcloth: 1,
    'Stone of Trials': 1,
    'Emerald Tablet': 1,
    'Ruby Tablet': 1,
    'Amber Tablet': 1,
    "Cawlin's Letter": 1,
    'Horned Colossus Beetle': 1,
    'Baby Rattle': 1,
    'Gratitude Crystal Pack': 13,
    'Gratitude Crystal': 15,
    'Progressive Slingshot': 2,
    'Progressive Beetle': 4,
    'Bomb Bag': 1,
    'Gust Bellows': 1,
    Whip: 1,
    Clawshots: 1,
    'Progressive Bow': 3,
    'Progressive Bug Net': 2,
    'Sea Chart': 1,
    'Lanayru Caves Small Key': 1,
    'Empty Bottle': 5,
    'Progressive Pouch': 1,
    'Spiral Charge': 1,
    'Life Tree Fruit': 1,
    'Group of Tadtones': 17,
    Scrapper: 1,
    'Skyview Boss Key': 1,
    'Earth Temple Boss Key': 1,
    'Lanayru Mining Facility Boss Key': 1,
    'Ancient Cistern Boss Key': 1,
    'Sandship Boss Key': 1,
    'Fire Sanctuary Boss Key': 1,
    Triforce: 3,
    'Skyview Small Key': 2,
    'Key Piece': 5,
    'Lanayru Mining Facility Small Key': 1,
    'Ancient Cistern Small Key': 2,
    'Sandship Small Key': 2,
    'Fire Sanctuary Small Key': 3,
    'Sky Keep Small Key': 1,
};

export type Items = keyof typeof itemMaxes;

export function isItem(id: string): id is Items {
    return id in itemMaxes;
}

export type Hint =
    | { type: 'barren' }
    | { type: 'sots' }
    | { type: 'path', index: number };

export interface State {
    /**
     * Checks we've acquired.
     * Includes regular checks and fake checks for cubes/crystals.
     */
    checkedChecks: string[];
    /**
     * Items we've marked as acquired.
     */
    inventory: Partial<Record<Items, number>>;
    /**
     * Whether we've modified our inventory since we loaded from starting items.
     */
    hasModifiedInventory: boolean;
    /**
     * Exits we've has mapped. Later merged with the vanilla connections depending on settings.
     */
    mappedExits: Record<string, string | undefined>;
    /**
     * Dungeons we've marked as required.
     */
    requiredDungeons: string[];
    /**
     * Fully decoded settings.
     */
    settings: TypedOptions;
}

export function mapInventory(logic: Logic, inventory: State['inventory'], checkedChecks: State['checkedChecks']) {
    const result = _.clone(inventory);
    const looseCrystalsCount = checkedChecks.filter((check) => logic.checks[check].type === 'loose_crystal').length;
    result['Gratitude Crystal'] = looseCrystalsCount;
    return result;
}

export function getTooltipOpaqueBits(logic: Logic) {
    const items = new BitVector(logic.bitLogic.numBits);
    const set = (id: string) => items.setBit(logic.items[id][1]);

    for (const [item, count] of Object.entries(itemMaxes)) {
        if (count === undefined || item === 'Sailcloth') {
            continue;
        }
        if (item === sothItemReplacement) {
            for (let i = 1; i <= count; i++) {
                set(sothItems[i - 1]);
            }
        } else if (item === triforceItemReplacement) {
            for (let i = 1; i <= count; i++) {
                set(triforceItems[i - 1]);
            }
        } else {
            for (let i = 1; i <= count; i++) {
                if (i === 1) {
                    set(item);
                } else {
                    set(`${item} x ${i}`);
                }
            }
        }
    }

    set(requiredDungeonsCompletedFakeRequirement);

    for (const [checkId, checkDef] of Object.entries(logic.checks)) {
        if (checkDef.type === 'tr_cube') {
            set(checkId);
        }
    }

    for (const amt of [5, 10, 30, 40, 50, 70, 80]) {
        set(`\\${amt} Gratitude Crystals`);
    }

    return items;
}

export function mapSettings(
    logic: Logic,
    options: OptionDefs,
    mappedExits: State['mappedExits'],
    activeVanillaConnections: Record<string, string>,
    // requiredDungeons: string[],
    settings: TypedOptions,
) {
    const implications: { [bitIndex: number]: LogicalExpression } = {};

    const trySet = (id: string) => {
        const item = logic.items[id];
        if (item) {
            implications[item[1]] = LogicalExpression.true(logic.bitLogic.numBits);
        }
    };

    for (const option of runtimeOptions) {
        const [item, command, expect] = option;
        const val = settings[command];
        const match = val !== undefined && (typeof expect === 'function' ? expect(val) : expect === val);
        if (match) {
            trySet(item);
        }
    }

    for (const option of options) {
        if (option.type === 'multichoice') {
            if (option.command === 'starting-items' || option.command === 'excluded-locations') {
                continue;
            }
            const vals = settings[option.command] as string[];
            const trick = option.command === 'enabled-tricks-glitched' || option.command === 'enabled-tricks-bitless';
            for (const option of vals) {
                if (trick) {
                    trySet(`${option} Trick`)
                } else {
                    trySet(`${option} option`)
                }
            }
        }
    }

    const vec = (id: string) => logic.items[id][0];
    const bit = (id: string) => logic.items[id][1];
    const dayVec = (id: string) => logic.items[makeDay(id)][0];
    const dayBit = (id: string) => logic.items[makeDay(id)][1];
    const nightVec = (id: string) => logic.items[makeNight(id)][0];
    const nightBit = (id: string) => logic.items[makeNight(id)][1];

    const raiseGotExpr = new LogicalExpression([settings['got-start'] ? new BitVector(logic.bitLogic.numBits) : vec(impaSongCheck)]);
    const neededSwords = swordsToAdd[settings['got-sword-requirement']];
    let openGotExpr = new LogicalExpression([vec(`Progressive Sword x ${neededSwords}`)]);
    let hordeDoorExpr = new LogicalExpression([settings['triforce-required'] ? vec(completeTriforceReq) : new BitVector(logic.bitLogic.numBits)])

    // const validRequiredDungeons = requiredDungeons.filter((d) => d in dungeonCompletionRequirements);
    // const requiredDungeonsCompleted = validRequiredDungeons.length > 0 && validRequiredDungeons.every((d) => checkedChecks.includes(dungeonCompletionRequirements[d as RegularDungeon]));

    // const dungeonsExpr = new LogicalExpression(requiredDungeonsCompleted ? [new BitVector(logic.numItems)]: []);
    const dungeonsExpr = LogicalExpression.false();

    if (settings['got-dungeon-requirement'] === 'Required') {
        openGotExpr = openGotExpr.and(dungeonsExpr);
    } else if (settings['got-dungeon-requirement'] === 'Unrequired') {
        hordeDoorExpr = hordeDoorExpr.and(dungeonsExpr);
    }

    implications[bit(gotOpeningReq)] = openGotExpr;
    implications[bit(gotRaisingReq)] = raiseGotExpr;
    implications[bit(hordeDoorReq)] = hordeDoorExpr;

    const mapConnection = (from: string, to: string) => {
        // console.log(`connection ${from} -> ${to}`);
        const exitArea = logic.areaGraph.areasByExit[from];
        const exitExpr = new LogicalExpression([vec(from)]);

        let dayReq: LogicalExpression;
        let nightReq: LogicalExpression;

        if (exitArea.abstract) {
            dayReq = exitExpr;
            nightReq = exitExpr;
        } else if (exitArea.allowedTimeOfDay === TimeOfDay.Both) {
            dayReq = exitExpr.and(dayVec(exitArea.name));
            nightReq = exitExpr.and(nightVec(exitArea.name));
        } else if (exitArea.allowedTimeOfDay === TimeOfDay.DayOnly) {
            dayReq = exitExpr;
            nightReq = LogicalExpression.false();
        } else if (exitArea.allowedTimeOfDay === TimeOfDay.NightOnly) {
            dayReq = LogicalExpression.false();
            nightReq = exitExpr;
        } else {
            throw new Error('bad ToD');
        }

        const entranceDef = logic.areaGraph.entrances[to];
        let bitReq: [bit: number, req: LogicalExpression][];
        if (entranceDef.allowed_time_of_day === TimeOfDay.Both) {
            bitReq = [
                [dayBit(to), dayReq],
                [nightBit(to), nightReq],
            ];
        } else if (entranceDef.allowed_time_of_day === TimeOfDay.DayOnly) {
            bitReq = [[bit(to), dayReq]];
        } else if (entranceDef.allowed_time_of_day === TimeOfDay.NightOnly) {
            bitReq = [[bit(to), nightReq]];
        } else {
            throw new Error('bad ToD');
        }

        for (const [bitIdx, expr] of bitReq) {
            implications[bitIdx] = (
                implications[bitIdx] ?? LogicalExpression.false()
            ).or(expr);
        }
    };

    for (const [from, to] of Object.entries(
        activeVanillaConnections,
    )) {
        mapConnection(from, to);
    }

    for (const [from, to] of Object.entries(
        mappedExits,
    )) {
        if (to !== undefined) {
            mapConnection(from, to);
        }
    }

    return implications;
}

export function mapState(
    logic: Logic,
    options: OptionDefs,
    inventory: State['inventory'],
    checkedChecks: State['checkedChecks'],
    mappedExits: State['mappedExits'],
    activeVanillaConnections: Record<string, string>,
    requiredDungeons: string[],
    settings: TypedOptions,
): {
    items: BitVector;
    implications: { [bitIndex: number]: LogicalExpression };
} {
    const items = new BitVector(logic.bitLogic.numBits);
    const implications: { [bitIndex: number]: LogicalExpression } = {};

    const set = (id: string) => items.setBit(logic.items[id][1]);
    const trySet = (id: string, implyToo = false) => {
        const item = logic.items[id];
        if (!item) {
            console.warn('invalid item', id)
            return;
        }
        items.setBit(item[1]);
        if (implyToo) {
            implications[item[1]] = LogicalExpression.true(logic.bitLogic.numBits);
        }
    };

    /** Mark checked things */
    for (const check of checkedChecks) {
        if (cubeCheckToCanAccessCube[check]) {
            set(check);
        }
    }

    const itemsList = Object.entries(mapInventory(logic, inventory, checkedChecks));

    for (const [item, count] of itemsList) {
        if (count === undefined || item === 'Sailcloth' || item === 'Total Gratitude Crystals') {
            continue;
        }
        if (item === sothItemReplacement) {
            for (let i = 1; i <= count; i++) {
                set(sothItems[i - 1]);
            }
        } else if (item === triforceItemReplacement) {
            for (let i = 1; i <= count; i++) {
                set(triforceItems[i - 1]);
            }
        } else {
            for (let i = 1; i <= count; i++) {
                if (i === 1) {
                    set(item);
                } else {
                    set(`${item} x ${i}`);
                }
            }
        }
    }

    for (const option of runtimeOptions) {
        const [item, command, expect] = option;
        const val = settings[command];
        const match = val !== undefined && (typeof expect === 'function' ? expect(val) : expect === val);
        if (match) {
            trySet(item, true);
        }
    }

    for (const option of options) {
        if (option.type === 'multichoice') {
            if (option.command === 'starting-items' || option.command === 'excluded-locations') {
                continue;
            }
            const vals = settings[option.command] as string[];
            const trick = option.command === 'enabled-tricks-glitched' || option.command === 'enabled-tricks-bitless';
            for (const option of vals) {
                if (trick) {
                    trySet(`${option} Trick`)
                } else {
                    trySet(`${option} option`)
                }
            }
        }
    }

    const vec = (id: string) => logic.items[id][0];
    const bit = (id: string) => logic.items[id][1];
    const dayVec = (id: string) => logic.items[makeDay(id)][0];
    const dayBit = (id: string) => logic.items[makeDay(id)][1];
    const nightVec = (id: string) => logic.items[makeNight(id)][0];
    const nightBit = (id: string) => logic.items[makeNight(id)][1];

    const raiseGotExpr = new LogicalExpression([settings['got-start'] ? new BitVector(logic.bitLogic.numBits) : vec(impaSongCheck)]);
    const neededSwords = swordsToAdd[settings['got-sword-requirement']];
    let openGotExpr = new LogicalExpression([vec(`Progressive Sword x ${neededSwords}`)]);
    let hordeDoorExpr = new LogicalExpression([settings['triforce-required'] ? vec(completeTriforceReq) : new BitVector(logic.bitLogic.numBits)])

    const validRequiredDungeons = requiredDungeons.filter((d) => d in dungeonCompletionRequirements);
    const requiredDungeonsCompleted = validRequiredDungeons.length > 0 && validRequiredDungeons.every((d) => checkedChecks.includes(dungeonCompletionRequirements[d as RegularDungeon]));

    const dungeonsExpr = new LogicalExpression(requiredDungeonsCompleted ? [new BitVector(logic.bitLogic.numBits)]: []);

    if (settings['got-dungeon-requirement'] === 'Required') {
        openGotExpr = openGotExpr.and(dungeonsExpr);
    } else if (settings['got-dungeon-requirement'] === 'Unrequired') {
        hordeDoorExpr = hordeDoorExpr.and(dungeonsExpr);
    }

    implications[bit(gotOpeningReq)] = openGotExpr;
    implications[bit(gotRaisingReq)] = raiseGotExpr;
    implications[bit(hordeDoorReq)] = hordeDoorExpr;

    // eslint-disable-next-line sonarjs/no-identical-functions
    const mapConnection = (from: string, to: string) => {
        const exitArea = logic.areaGraph.areasByExit[from];
        const exitExpr = new LogicalExpression([vec(from)]);

        let dayReq: LogicalExpression;
        let nightReq: LogicalExpression;

        if (exitArea.abstract) {
            dayReq = exitExpr;
            nightReq = exitExpr;
        } else if (exitArea.allowedTimeOfDay === TimeOfDay.Both) {
            dayReq = exitExpr.and(dayVec(exitArea.name));
            nightReq = exitExpr.and(nightVec(exitArea.name));
        } else if (exitArea.allowedTimeOfDay === TimeOfDay.DayOnly) {
            dayReq = exitExpr;
            nightReq = LogicalExpression.false();
        } else if (exitArea.allowedTimeOfDay === TimeOfDay.NightOnly) {
            dayReq = LogicalExpression.false();
            nightReq = exitExpr;
        } else {
            throw new Error('bad ToD');
        }

        const entranceDef = logic.areaGraph.entrances[to];
        let bitReq: [bit: number, req: LogicalExpression][];
        if (entranceDef.allowed_time_of_day === TimeOfDay.Both) {
            bitReq = [
                [dayBit(to), dayReq],
                [nightBit(to), nightReq],
            ];
        } else if (entranceDef.allowed_time_of_day === TimeOfDay.DayOnly) {
            bitReq = [[bit(to), dayReq]];
        } else if (entranceDef.allowed_time_of_day === TimeOfDay.NightOnly) {
            bitReq = [[bit(to), nightReq]];
        } else {
            throw new Error('bad ToD');
        }

        for (const [bitIdx, expr] of bitReq) {
            implications[bitIdx] = (
                implications[bitIdx] ?? LogicalExpression.false()
            ).or(expr);
        }
    };

    for (const [from, to] of Object.entries(
        activeVanillaConnections,
    )) {
        mapConnection(from, to);
    }

    for (const [from, to] of Object.entries(
        mappedExits,
    )) {
        if (to !== undefined) {
            mapConnection(from, to);
        }
    }

    // mapConnection("\\", "\\Skyloft\\Upper Skyloft\\Knight Academy\\Link's Room_DAY");

    /*

    for (const [from, to] of Object.entries(state.mappedExits)) {
        const fromVec = logic.items[from][0];
        const toBit = logic.items[to][1];
        implications[toBit] ??= new LogicalExpression([]);
        implications[toBit] = implications[toBit].or(fromVec);
    }

    */

    return { items, implications };
}
