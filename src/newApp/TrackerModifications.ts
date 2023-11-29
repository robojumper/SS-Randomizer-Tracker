import { TypedOptions2 } from "../permalink/SettingsTypes";
import { Items, State, isItem } from "./State";
import goddessCubesList_ from '../data/goddessCubes2.json';
import _ from "lodash";
import { swordsToAdd } from "./ThingsThatWouldBeNiceToHaveInTheDump";

const canAccessCubeSuffix = '_TR_Cube_CanAccess';

export const goddessChestCheckToCubeCheck = Object.fromEntries(goddessCubesList_ as [string, string][]);
export const cubeCheckToGoddessChestCheck = _.invert(goddessChestCheckToCubeCheck);
export const cubeCheckToCanAccessCube = Object.fromEntries(Object.keys(cubeCheckToGoddessChestCheck).map((check) => [check, mapToCanAccessCubeRequirement(check)]));
export const canAccessCubeToCubeCheck = _.invert(cubeCheckToCanAccessCube);

export function mapToCanAccessCubeRequirement(check: string) {
    return `${check}${canAccessCubeSuffix}`;
}


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
        } else if (isItem(item) && (!item.includes('Pouch') || !items['Progressive Pouch'])) {
            add(item);
        }
    }

    return items;
}
