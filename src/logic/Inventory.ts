import _ from 'lodash';
import { TypedOptions } from '../permalink/SettingsTypes';
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

// The order here defines the order of items in requirement tooltips too
export const itemMaxes = {
    Sailcloth: 1,

    'Emerald Tablet': 1,
    'Ruby Tablet': 1,
    'Amber Tablet': 1,

    'Lanayru Caves Small Key': 1,
    'Sea Chart': 1,
    'Stone of Trials': 1,

    'Empty Bottle': 5,
    'Progressive Pouch': 1,
    'Progressive Wallet': 4,
    'Extra Wallet': 3,

    'Progressive Sword': 6,

    'Progressive Slingshot': 2,
    'Progressive Beetle': 4,
    'Bomb Bag': 1,
    'Gust Bellows': 1,
    Whip: 1,
    Clawshots: 1,
    'Progressive Bow': 3,
    'Progressive Bug Net': 2,

    'Progressive Mitts': 2,
    "Water Dragon's Scale": 1,
    'Fireshield Earrings': 1,

    "Goddess's Harp": 1,
    'Ballad of the Goddess': 1,

    "Farore's Courage": 1,
    "Nayru's Wisdom": 1,
    "Din's Power": 1,
    'Song of the Hero': 3,
    Triforce: 3,

    "Cawlin's Letter": 1,
    'Horned Colossus Beetle': 1,
    'Baby Rattle': 1,
    'Gratitude Crystal Pack': 13,
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
    'Skyview Small Key': 2,
    'Key Piece': 5,
    'Lanayru Mining Facility Small Key': 1,
    'Ancient Cistern Small Key': 2,
    'Sandship Small Key': 2,
    'Fire Sanctuary Small Key': 3,
    'Sky Keep Small Key': 1,

    Tumbleweed: 1,
};

export type InventoryItem = keyof typeof itemMaxes;

export const itemOrder = Object.fromEntries(
    Object.keys(itemMaxes).map((item, idx) => [item, idx]),
) as Record<InventoryItem, number>;

export function isItem(id: string): id is InventoryItem {
    return id in itemMaxes;
}

/**
 * Returns a BitVector containing all the expressions that should be visible in the tooltips
 * and not recursively expanded (items and various item-like requirements).
 */
export function getTooltipOpaqueBits(
    logic: Logic,
    settings: TypedOptions,
    expertMode: boolean,
    consideredTricks: Set<string>,
) {
    const items = new BitVector();
    const set = (id: string) => {
        const bit = logic.itemBits[id];
        if (bit !== undefined) {
            items.setBit(bit);
        } else {
            console.error('unknown item', id);
        }
    };

    for (const [req, condition] of Object.entries(logic.optionConditions)) {
        if (
            condition.type === 'query' &&
            condition.op === 'in' &&
            (condition.option === 'enabled-tricks-glitched' ||
                condition.option === 'enabled-tricks-bitless')
        ) {
            const value = condition.value as string;
            const considered =
                settings[condition.option].includes(value) ||
                (expertMode &&
                    (!consideredTricks.size || consideredTricks.has(value)));
            if (considered) {
                set(req);
            }
        }
    }

    // All actual inventory items are shown in the tooltips
    for (const [item, count] of Object.entries(itemMaxes)) {
        if (
            count === undefined ||
            item === 'Sailcloth' ||
            item === 'Tumbleweed'
        ) {
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

    if (_.isEmpty(logic.counterThresholds)) {
        // No point in revealing that the math behind 80 crystals is 13*5+15
        for (const amt of [5, 10, 30, 40, 50, 70, 80]) {
            set(`\\${amt} Gratitude Crystals`);
        }
    } else {
        for (const counter of Object.keys(logic.counterThresholds)) {
            set(counter);
        }
    }

    if (settings['gondo-upgrades'] === false) {
        set(
            "\\Skyloft\\Central Skyloft\\Bazaar\\Gondo's Upgrades\\Upgrade to Quick Beetle",
        );
        set(
            "\\Skyloft\\Central Skyloft\\Bazaar\\Gondo's Upgrades\\Upgrade to Tough Beetle",
        );
    }

    return items;
}
