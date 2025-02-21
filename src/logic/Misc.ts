import type { InventoryItem } from './Inventory';
import type { Logic2 } from './logic2/Logic';
import { dungeonCompletionItems } from './TrackerModifications';

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

    if (inventory['Triforce'] === 3) {
        result[dungeonCompletionItems['Sky Keep']] = 1;
    }

    return result;
}
