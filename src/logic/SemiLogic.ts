import type { OptionDefs, TypedOptions } from '../permalink/SettingsTypes';
import { isItem, itemMaxes } from './Inventory';
import { type PotentialLocations, getSemiLogicKeys } from './KeyLogic';
import { type Logic, isRegularItemCheck } from './Logic';
import { LogicBuilder } from './LogicBuilder';
import { type Requirements } from './bitlogic/BitLogic';
import type { SearchExits2 } from './logic2/Entrance';
import type { Logic2 } from './logic2/Logic';
import { type SearchState2, cloneSearchState, search } from './logic2/Search';

export interface SemiLogicState {
    state: SearchState2;
    assumedChecks: Set<string>;
}

/**
 * Requirements that assume every considered trick is enabled. Enables
 * all tricks if consideredTricks is empty.
 */
export function getVisibleTricks(
    options: OptionDefs,
    settings: TypedOptions,
    expertMode: boolean,
    consideredTricks: Set<string>,
): Set<string> {
    const result = new Set<string>();

    if (!expertMode) {
        return result;
    }

    for (const option of options) {
        if (
            option.type === 'multichoice' &&
            (option.command === 'enabled-tricks-glitched' ||
                option.command === 'enabled-tricks-bitless')
        ) {
            const vals = option.choices;
            for (const opt of vals) {
                const considered =
                    settings[option.command].includes(opt) ||
                    !consideredTricks.size ||
                    consideredTricks.has(opt);
                if (considered) {
                    result.add(opt);
                }
            }
        }
    }

    return result;
}

/**
 * Requirements that assume every considered trick is enabled. Enables
 * all tricks if consideredTricks is empty.
 */
export function getVisibleTricksEnabledRequirements(
    logic: Logic,
    options: OptionDefs,
    settings: TypedOptions,
    consideredTricks: Set<string>,
): Requirements {
    const requirements: Requirements = {};
    const b = new LogicBuilder(logic.allItems, logic.itemLookup, requirements);

    for (const option of options) {
        if (
            option.type === 'multichoice' &&
            (option.command === 'enabled-tricks-glitched' ||
                option.command === 'enabled-tricks-bitless')
        ) {
            const vals = option.choices;
            for (const opt of vals) {
                const considered =
                    settings[option.command].includes(opt) ||
                    !consideredTricks.size ||
                    consideredTricks.has(opt);
                if (considered) {
                    b.set(`${opt} Trick`, b.true());
                }
            }
        }
    }

    return requirements;
}

export function computeSemiLogic(
    logic: Logic2,
    exits: SearchExits2,
    isCheckBanned: (checkId: string) => boolean,
    checkedChecks: Set<string>,
    inLogicSearchState: SearchState2,
    dungeonKeyLogic: PotentialLocations[],
    checkHints: Record<string, string | undefined>,
    expertMode: boolean,
): { semiLogicSearchState: SearchState2; trickLogicSearchState: SearchState2 } {
    const semiLogicState: SemiLogicState = {
        assumedChecks: new Set(checkedChecks),
        state: cloneSearchState(inLogicSearchState),
    };

    while (
        semiLogicStep(
            logic,
            exits,
            isCheckBanned,
            dungeonKeyLogic,
            semiLogicState,
            checkHints,
        )
    ) {
        // Keep advancing through semilogic
    }

    if (!expertMode) {
        return {
            semiLogicSearchState: semiLogicState.state,
            trickLogicSearchState: semiLogicState.state,
        };
    }

    const semiLogicOnlyState = {
        assumedChecks: new Set(semiLogicState.assumedChecks),
        state: cloneSearchState(semiLogicState.state),
    };
    semiLogicState.state.allowTricks = true;
    semiLogicState.state = search(logic, exits, semiLogicState.state);

    while (
        semiLogicStep(
            logic,
            exits,
            isCheckBanned,
            dungeonKeyLogic,
            semiLogicState,
            checkHints,
        )
    ) {
        // Keep advancing through semilogic
    }

    return {
        semiLogicSearchState: semiLogicOnlyState.state,
        trickLogicSearchState: semiLogicState.state,
    };
}

function semiLogicStep(
    logic: Logic2,
    exits: SearchExits2,
    isCheckBanned: (checkId: string) => boolean,
    dungeonKeyLogic: PotentialLocations[],
    state: SemiLogicState,
    checkHints: Record<string, string | undefined>,
): boolean {
    let changed = false;
    for (const [checkId, checkDef] of Object.entries(logic.locations)) {
        if (
            state.state.reachableChecks.has(checkId) &&
            !state.assumedChecks.has(checkId)
        ) {
            state.assumedChecks.add(checkId);

            if (checkDef.containedAuxItem && !isCheckBanned(checkId)) {
                state.state.auxItems[checkDef.containedAuxItem] ??= 0;
                state.state.auxItems[checkDef.containedAuxItem]++;
                changed = true;
            }

            const hintedItem = checkHints[checkId];
            if (
                isRegularItemCheck(logic.locations[checkId].type) &&
                hintedItem !== undefined &&
                isItem(hintedItem)
            ) {
                state.state.inventory[hintedItem] = Math.min(
                    itemMaxes[hintedItem],
                    state.state.inventory[hintedItem] + 1,
                );
                changed = true;
            }
        }
    }

    const hasNewKeys = getSemiLogicKeys(
        state.state.inventory,
        dungeonKeyLogic,
        state.state,
        state.assumedChecks,
    );
    changed ||= hasNewKeys;

    if (changed) {
        state.state = search(logic, exits, state.state);
    }

    return changed;
}
