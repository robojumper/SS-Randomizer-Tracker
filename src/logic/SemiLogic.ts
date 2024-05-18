import { TypedOptions } from '../permalink/SettingsTypes';
import { mapInventory, getAdditionalItems } from '../tracker/selectors';
import { InventoryItem, isItem, itemMaxes } from './Inventory';
import { PotentialLocations, getSemiLogicKeys } from './KeyLogic';
import { Logic } from './Logic';
import { LogicBuilder } from './LogicBuilder';
import { cubeCheckToCubeCollected } from './TrackerModifications';
import {
    Requirements,
    computeLeastFixedPoint,
    mergeRequirements,
} from './bitlogic/BitLogic';
import { BitVector } from './bitlogic/BitVector';

export interface SemiLogicState {
    semiLogicBits: BitVector;
    assumedInventory: Record<InventoryItem, number>;
    assumedChecks: Set<string>;
}

/**
 * Requirements that assume every considered trick is enabled. Enables
 * all tricks if consideredTricks is empty.
 */
export function getVisibleTricksEnabledRequirements(
    logic: Logic,
    settings: TypedOptions,
    consideredTricks: Set<string>,
): Requirements {
    const requirements: Requirements = {};
    const b = new LogicBuilder(logic.allItems, logic.itemLookup, requirements);

    for (const [requirement, condition] of Object.entries(
        logic.optionConditions,
    )) {
        if (
            condition.type === 'query' &&
            (condition.option === 'enabled-tricks-glitched' ||
                condition.option === 'enabled-tricks-bitless')
        ) {
            const settingsEnabledTricks = settings[condition.option];
            if (
                Array.isArray(settingsEnabledTricks) &&
                typeof condition.value === 'string'
            ) {
                const visible =
                    settingsEnabledTricks.includes(condition.value) ||
                    !consideredTricks.size ||
                    consideredTricks.has(condition.value);
                if (visible) {
                    b.set(requirement, b.true());
                }
            }
        }
    }

    return requirements;
}

export function computeSemiLogic(
    logic: Logic,
    checkedChecks: Set<string>,
    inventory: Record<InventoryItem, number>,
    inLogicBits: BitVector,
    dungeonKeyLogic: PotentialLocations[],
    settingsRequirements: Requirements,
    checkHints: Record<string, string | undefined>,
    expertMode: boolean,
    allTricksRequirements: Requirements,
): { inSemiLogicBits: BitVector; inTrickLogicBits: BitVector } {
    const semiLogicState: SemiLogicState = {
        assumedChecks: new Set(checkedChecks),
        assumedInventory: { ...inventory },
        semiLogicBits: inLogicBits.clone(),
    };

    while (
        semiLogicStep(
            logic,
            dungeonKeyLogic,
            settingsRequirements,
            semiLogicState,
            checkHints,
        )
    ) {
        // Keep advancing through semilogic
    }

    const inSemiLogicBits = semiLogicState.semiLogicBits.clone();

    if (!expertMode) {
        return {
            inSemiLogicBits,
            inTrickLogicBits: semiLogicState.semiLogicBits,
        };
    }

    const settingsRequirementsWithTricks = {
        ...settingsRequirements,
        ...allTricksRequirements,
    };

    while (
        semiLogicStep(
            logic,
            dungeonKeyLogic,
            settingsRequirementsWithTricks,
            semiLogicState,
            checkHints,
        )
    ) {
        // Keep advancing through semilogic with tricks
    }

    return { inSemiLogicBits, inTrickLogicBits: semiLogicState.semiLogicBits };
}

function semiLogicStep(
    logic: Logic,
    dungeonKeyLogic: PotentialLocations[],
    settingsRequirements: Requirements,
    state: SemiLogicState,
    checkHints: Record<string, string | undefined>,
): boolean {
    const assumedInventoryReqs = mapInventory(logic, state.assumedInventory);
    const assumedCheckReqs = mapInventory(
        logic,
        getAdditionalItems(logic, state.assumedInventory, state.assumedChecks),
    );

    state.semiLogicBits = computeLeastFixedPoint(
        'Semilogic step',
        mergeRequirements(
            logic.numRequirements,
            logic.staticRequirements,
            settingsRequirements,
            assumedInventoryReqs,
            assumedCheckReqs,
        ),
        // Monotonicity of these requirements allows reusing semiLogicBits
        state.semiLogicBits,
    );

    let changed = false;
    // The assumed number of loose gratitude crystals is the number of
    // loose crystal checks that are either checked or are in logic.
    for (const [checkId, checkDef] of Object.entries(logic.checks)) {
        if (state.semiLogicBits.test(logic.itemBits[checkId])) {
            if (
                checkDef.type === 'loose_crystal' &&
                !state.assumedChecks.has(checkId)
            ) {
                state.assumedChecks.add(checkId);
                changed = true;
            }

            const hintedItem = checkHints[checkId];
            if (
                hintedItem !== undefined &&
                isItem(hintedItem) &&
                !state.assumedChecks.has(checkId)
            ) {
                state.assumedChecks.add(checkId);
                state.assumedInventory[hintedItem] = Math.min(
                    itemMaxes[hintedItem],
                    state.assumedInventory[hintedItem] + 1,
                );
                changed = true;
            }
        }
    }

    for (const cubeCheck of Object.keys(cubeCheckToCubeCollected)) {
        if (
            state.semiLogicBits.test(logic.itemBits[cubeCheck]) &&
            !state.assumedChecks.has(cubeCheck)
        ) {
            state.assumedChecks.add(cubeCheck);
            changed = true;
        }
    }

    for (const dungeonCompletionCheck of Object.values(
        logic.dungeonCompletionRequirements,
    )) {
        if (
            state.semiLogicBits.test(logic.itemBits[dungeonCompletionCheck]) &&
            !state.assumedChecks.has(dungeonCompletionCheck)
        ) {
            state.assumedChecks.add(dungeonCompletionCheck);
            changed = true;
        }
    }

    const hasNewKeys = getSemiLogicKeys(
        logic,
        state.assumedInventory,
        dungeonKeyLogic,
        state.semiLogicBits,
        state.assumedChecks,
    );
    changed ||= hasNewKeys;

    return changed;
}
