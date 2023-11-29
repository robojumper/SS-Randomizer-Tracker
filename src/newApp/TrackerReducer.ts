import { produce } from "immer";
import ColorScheme from "../customization/ColorScheme";
import { Layout } from "../customization/CustomizationModal";
import { Hint, State as TrackerState, isItem, itemMaxes } from "./State";
import { TypedOptions2 } from "../permalink/SettingsTypes";
import { getInitialItems } from "./TrackerModifications";

export interface AppState {
    trackerState: TrackerState,
    width: number;
    height: number;
    colorScheme: ColorScheme;
    layout: Layout;
    showEntranceDialog: boolean;
    showCustomizationDialog: boolean;
    showOptionsDialog: boolean;
    activeArea: string | undefined;
}

export type TrackerAction =
    | { type: 'onItemClick', item: string, take: boolean }
    | { type: 'onCheckClick', check: string, markChecked?: boolean }
    | { type: 'onDungeonNameClick', dungeon: string, }
    | { type: 'bulkEditChecks', checks: string[], check: boolean }
    | { type: 'onAreaClick', area: string }
    | { type: 'mapEntrance', from: string, to: string | undefined }
    | { type: 'setHint', area: string, hint: Hint | undefined }
    | { type: 'setCheckHint', checkId: string, hintItem: string | undefined }
    | { type: 'showEntranceDialog', show: boolean }
    | { type: 'showCustomizationDialog', show: boolean }
    | { type: 'showOptionsDialog', show: boolean }
    | { type: 'acceptSettings', settings: TypedOptions2 }
    | { type: 'setLayout', layout: Layout }
    | { type: 'setColorScheme', colorScheme: ColorScheme }
    | { type: 'reset', settings: TypedOptions2 | undefined }
    | { type: 'import', state: TrackerState };

export const trackerReducer = (state: AppState, action: TrackerAction): AppState => {
    switch (action.type) {
        case 'onItemClick': {
            if (!isItem(action.item)) {
                throw new Error(`bad item ${action.item}`);
            }
            if (action.item === 'Sailcloth') {
                return state;
            }
            const item = action.item;
            const max = itemMaxes[item];
            const count = state.trackerState.inventory[item] ?? 0;
            let newCount = action.take ? count - 1 : count + 1;
            if (newCount < 0) {
                newCount += max + 1;
            } else if (newCount > max) {
                newCount -= max + 1;
            }

            return produce(state, (draft) => {
                draft.trackerState.hasModifiedInventory = true;
                draft.trackerState.inventory[item] = newCount;
            });
        }
        case 'showEntranceDialog': {
            return {
                ...state,
                showEntranceDialog: action.show,
            };
        }
        case 'showCustomizationDialog': {
            return {
                ...state,
                showCustomizationDialog: action.show,
            };
        }
        case 'showOptionsDialog': {
            return {
                ...state,
                showOptionsDialog: action.show,
            };
        }
        case 'acceptSettings': {
            return produce(state, (draft) => {
                draft.trackerState.settings = action.settings;
                if (!draft.trackerState.hasModifiedInventory) {
                    draft.trackerState.inventory = getInitialItems(action.settings);
                }
            });
        }
        case 'onCheckClick': {
            return produce(state, (draft) => {
                const add = action.markChecked !== undefined ? action.markChecked : !draft.trackerState.checkedChecks.includes(action.check);
                if (add) {
                    draft.trackerState.checkedChecks.push(action.check);
                } else {
                    draft.trackerState.checkedChecks = draft.trackerState.checkedChecks.filter((c) => c !== action.check);
                }
            });
        }
        case 'onDungeonNameClick': {
            return produce(state, (draft) => {
                if (draft.trackerState.requiredDungeons.includes(action.dungeon)) {
                    draft.trackerState.requiredDungeons = draft.trackerState.requiredDungeons.filter((c) => c !== action.dungeon);
                } else {
                    draft.trackerState.requiredDungeons.push(action.dungeon);
                }
            });
        }
        case 'bulkEditChecks': {
            return produce(state, (draft) => {
                const oldChecks = new Set(draft.trackerState.checkedChecks);
                if (action.check) {
                    for (const check of action.checks) {
                        oldChecks.add(check);
                    }
                } else {
                    for (const check of action.checks) {
                        oldChecks.delete(check);
                    }
                }
                draft.trackerState.checkedChecks = [...oldChecks];
            });
        }
        case 'onAreaClick': {
            return produce(state, (draft) => {
                draft.activeArea = action.area === draft.activeArea ? undefined : action.area;
            });
        }
        case 'mapEntrance': {
            return produce(state, (draft) => {
                draft.trackerState.mappedExits[action.from] = action.to;
            })
        }
        case 'setHint': {
            return produce(state, (draft) => {
                draft.trackerState.hints[action.area] = action.hint;
            })
        }
        case 'setCheckHint': {
            return produce(state, (draft) => {
                draft.trackerState.checkHints[action.checkId] = action.hintItem;
            })
        }
        case 'setLayout': {
            return {
                ...state,
                layout: action.layout,
            };
        }
        case 'setColorScheme': {
            return {
                ...state,
                colorScheme: action.colorScheme,
            };
        }
        case 'reset': {
            const settings = action.settings ?? state.trackerState.settings;
            return {
                ...state,
                activeArea: undefined,
                trackerState: {
                    checkedChecks: [],
                    hasModifiedInventory: false,
                    inventory: getInitialItems(settings),
                    mappedExits: {},
                    requiredDungeons: [],
                    hints: {},
                    checkHints: {},
                    settings,
                }
            };
        }
        case 'import': {
            // TODO: Validate
            return {
                ...state,
                trackerState: action.state,
            };
        }
        default:
            throw new Error("unreachable");
    }
}
