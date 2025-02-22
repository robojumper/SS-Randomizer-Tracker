import type { InventoryItem } from './Inventory';
import type { Logic2 } from './logic2/Logic';
import {
    dungeonCompletionItems,
    sothItems,
    triforceItems,
} from './TrackerModifications';

export function getAdditionalItems(
    logic: Logic2,
    inventory: Record<InventoryItem, number>,
    checkedChecks: Set<string>,
) {
    const result: Record<string, number> = {};
    for (const checkId of checkedChecks) {
        const check = logic.locations[checkId];
        if (check.containedAuxItem) {
            result[check.containedAuxItem] ??= 0;
            result[check.containedAuxItem]++;
        }
    }

    for (let i = 1; i <= inventory['Song of the Hero']; i++) {
        result[sothItems[i - 1]] = 1;
    }

    for (let i = 1; i <= inventory['Triforce']; i++) {
        result[triforceItems[i - 1]] = 1;
    }

    if (inventory['Triforce'] === 3) {
        result[dungeonCompletionItems['Sky Keep']] = 1;
    }

    return result;
}
