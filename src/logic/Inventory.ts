import { AllTypedOptions } from '../permalink/SettingsTypes';
import { BitVector } from './bitlogic/BitVector';
import { Logic } from './Logic';
import { requiredDungeonsCompletedFakeRequirement, sothItemReplacement, sothItems, triforceItemReplacement, triforceItems } from './TrackerModifications';

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
    settings: AllTypedOptions;
}

export function getTooltipOpaqueBits(logic: Logic) {
    const items = new BitVector(logic.bitLogic.numBits);
    const set = (id: string) => {
        const bit = logic.itemBits[id];
        if (bit !== undefined) {
            items.setBit(bit)
        } else {
            console.error('unknown item', id);
        }
    };

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
