import { BitVector } from "./BitVector";
import { LogicalExpression } from "./LogicalExpression";
import { Logic, makeDay, makeNight } from "./NewLogic";
import { TimeOfDay } from "./UpstreamTypes";

export const itemMaxes = {
    'Progressive Sword': 6,
    'Progressive Wallet': 4,
    'Extra Wallet': 3,
    'Progressive Mitts': 2,
    'Water Dragon\'s Scale': 1,
    'Fireshield Earrings': 1,
    'Goddess\'s Harp': 1,
    'Farore\'s Courage': 1,
    'Nayru\'s Wisdom': 1,
    'Din\'s Power': 1,
    'Ballad of the Goddess': 1,
    'Song of the Hero': 3,
    'Sailcloth': 1,
    'Stone of Trials': 1,
    'Emerald Tablet': 1,
    'Ruby Tablet': 1,
    'Amber Tablet': 1,
    'Cawlin\'s Letter': 1,
    'Horned Colossus Beetle': 1,
    'Baby Rattle': 1,
    'Gratitude Crystal Pack': 13,
    'Gratitude Crystal': 15,
    'Progressive Slingshot': 2,
    'Progressive Beetle': 4,
    'Bomb Bag': 1,
    'Gust Bellows': 1,
    'Whip': 1,
    'Clawshots': 1,
    'Progressive Bow': 3,
    'Progressive Bug Net': 2,
    'Sea Chart': 1,
    'Lanayru Caves Small Key': 1,
    'Empty Bottle': 5,
    'Progressive Pouch': 1,
    'Spiral Charge': 1,
    'Life Tree Fruit': 1,
    'Group of Tadtones': 17,
    'Scrapper': 1,
    'Skyview Boss Key': 1,
    'Earth Temple Boss Key': 1,
    'Lanayru Mining Facility Boss key': 1,
    'Ancient Cistern Boss Key': 1,
    'Sandship Boss key': 1,
    'Fire Sanctuary Boss key': 1,
    'Triforce': 3,
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

export const sothItems = [
    'Faron Song of the Hero Part',
    'Eldin Song of the Hero Part',
    'Lanayru Song of the Hero Part',
];

export const triforceItems = [
    'Triforce of Power',
    'Triforce of Wisdom',
    'Triforce of Courage',
];

export interface State {
    checkedChecks: string[];
    acquiredItems: Partial<Record<Items, number>>;
    mappedExits: Record<string, string>;
    startingEntrance: string;
}

export function mapState(logic: Logic, state: State): {
    items: BitVector,
    implications: { [bitIndex: number]: LogicalExpression },
} {
    const items = new BitVector(logic.numItems);
    const implications: { [bitIndex: number]: LogicalExpression } = {};

    const set = (id: string) => items.setBit(logic.items[id][1]);
    for (const [item, count] of Object.entries(state.acquiredItems)) {
        if (count === undefined) {
            continue;
        }
        if (item === "Song of the Hero") {
            for (let i = 1; i <= count; i++) {
                set(sothItems[i - 1]);
            }
        } else if (item === "Triforce") {
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

    const vec = (id: string) => logic.items[id][0];
    const bit = (id: string) => logic.items[id][1];
    const dayVec = (id: string) => logic.items[makeDay(id)][0];
    const dayBit = (id: string) => logic.items[makeDay(id)][1];
    const nightVec = (id: string) => logic.items[makeNight(id)][0];
    const nightBit = (id: string) => logic.items[makeNight(id)][1];

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
            dayReq = exitExpr.and(dayVec(exitArea.name))
            nightReq = exitExpr.and(nightVec(exitArea.name))
        } else if (exitArea.allowedTimeOfDay === TimeOfDay.DayOnly) {
            dayReq = exitExpr;
            nightReq = new LogicalExpression([]);
        } else if (exitArea.allowedTimeOfDay === TimeOfDay.NightOnly) {
            dayReq = new LogicalExpression([]);
            nightReq = exitExpr;
        } else {
            throw new Error("bad ToD");
        }

        const entranceDef = logic.areaGraph.entrances[to];
        let bitReq: [bit: number, req: LogicalExpression][];
        if (entranceDef.allowed_time_of_day === TimeOfDay.Both) {
            bitReq = [
                [dayBit(to), dayReq],
                [nightBit(to), nightReq],
            ]
        } else if (entranceDef.allowed_time_of_day === TimeOfDay.DayOnly) {
            bitReq = [
                [bit(to), dayReq],
            ]
        } else if (entranceDef.allowed_time_of_day === TimeOfDay.NightOnly) {
            bitReq = [
                [bit(to), nightReq],
            ]
        } else {
            throw new Error("bad ToD");
        }

        for (const [bitIdx, expr] of bitReq) {
            implications[bitIdx] = (implications[bitIdx] ?? new LogicalExpression([])).or(expr);
        }

    }

    for (const [from, to] of Object.entries(logic.areaGraph.vanillaConnections)) {
        mapConnection(from, to);
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

export function mapSettings(logic: Logic, state: State) {

}