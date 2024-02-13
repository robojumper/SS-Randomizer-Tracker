import { OptionDefs, TypedOptions } from '../permalink/SettingsTypes';
import { BitVector } from './bitlogic/BitVector';
import { itemName, Logic } from './Logic';
import {
    cubeCheckToCubeCollected,
    dungeonCompletionItems,
    sothItemReplacement,
    sothItems,
    triforceItemReplacement,
    triforceItems,
} from './TrackerModifications';

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

export type InventoryItem = keyof typeof itemMaxes;

export function isItem(id: string): id is InventoryItem {
    return id in itemMaxes;
}

/**
 * Returns a BitVector containing all the expressions that should be visible in the tooltips
 * and not recursively expanded (items and various item-like requirements).
 */
export function getTooltipOpaqueBits(logic: Logic, options: OptionDefs, settings: TypedOptions, expertMode: boolean) {
    const items = new BitVector();
    const set = (id: string) => {
        const bit = logic.itemBits[id];
        if (bit !== undefined) {
            items.setBit(bit);
        } else {
            console.error('unknown item', id);
        }
    };

    for (const option of options) {
        if (
            option.type === 'multichoice' &&
            (option.command === 'enabled-tricks-glitched' ||
                option.command === 'enabled-tricks-bitless')
        ) {
            if (expertMode) {
                const vals = option.choices;
                for (const opt of vals) {
                    set(`${opt} Trick`);
                }
            } else {
                for (const opt of settings[option.command]) {
                    set(`${opt} Trick`);
                }
            }
        }
    }

    // All actual inventory items are shown in the tooltips
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
                set(itemName(item, i));
            }
        }
    }

    // Zelda's Blessing should show the various $Dungeon Completed requirements
    for (const fakeItem of Object.values(dungeonCompletionItems)) {
        set(fakeItem);
    }

    // Goddess chest tooltips should show the corresponding goddess cube.
    for (const cubeItem of Object.values(cubeCheckToCubeCollected)) {
        set(cubeItem);
    }

    // No point in revealing that the math behind 80 crystals is 13*5+15
    for (const amt of [5, 10, 30, 40, 50, 70, 80]) {
        set(`\\${amt} Gratitude Crystals`);
    }

    set('\\Skyloft\\Central Skyloft\\Bazaar\\Gondo\'s Upgrades\\Upgrade to Quick Beetle');
    set('\\Skyloft\\Central Skyloft\\Bazaar\\Gondo\'s Upgrades\\Upgrade to Tough Beetle');

    return items;
}
