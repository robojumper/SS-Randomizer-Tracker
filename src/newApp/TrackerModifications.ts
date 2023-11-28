import { TypedOptions, TypedOptions2 } from "../permalink/SettingsTypes";
import { Items, State, isItem } from "./State";

export const sothItems = [
    'Faron Song of the Hero Part',
    'Eldin Song of the Hero Part',
    'Lanayru Song of the Hero Part',
];

export const sothItemReplacement = 'Song of the Hero';

export const triforceItems = [
    'Triforce of Power',
    'Triforce of Wisdom',
    'Triforce of Courage',
];

export const triforceItemReplacement = 'Triforce';

export function getInitialItems(
    settings: Partial<TypedOptions2>,
): State['inventory'] {
    const items: State['inventory'] = {};
    const add = (item: Items, count: number = 1) => {
        items[item] ??= 0;
        items[item]! += count;
    };
    add('Sailcloth');
    if (settings['starting-tablet-count'] === 3) {
        add('Emerald Tablet');
        add('Ruby Tablet');
        add('Amber Tablet');
    }
    add('Gratitude Crystal Pack', settings['starting-crystal-packs'] ?? 0);
    add('Group of Tadtones', settings['starting-tadtones'] ?? 0);
    add('Empty Bottle', settings['starting-bottles'] ?? 0);

    const swordsToAdd: Record<string, number> = {
        Swordless: 0,
        'Practice Sword': 1,
        'Goddess Sword': 2,
        'Goddess Longsword': 3,
        'Goddess White Sword': 4,
        'Master Sword': 5,
        'True Master Sword': 6,
    };
    add(
        'Progressive Sword',
        swordsToAdd[settings['starting-sword'] ?? 'Swordless'],
    );
    const startingItems = settings['starting-items'] ?? [];
    for (const item of startingItems) {
        if (item.includes(sothItemReplacement)) {
            add(sothItemReplacement);
        } else if (item.includes(triforceItemReplacement)) {
            add(triforceItemReplacement);
        } else if (isItem(item) && (!item.includes('Pouch') || !startingItems.includes('Progressive Pouch'))) {
            add(item);
        }
    }

    return items;
}
