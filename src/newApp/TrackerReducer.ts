import { produce } from "immer";
import ColorScheme from "../customization/ColorScheme";
import { Layout } from "../customization/CustomizationModal";
import { Hint, State, isItem, itemMaxes } from "./State";
import { TypedOptions2 } from "../permalink/SettingsTypes";
import { getInitialItems } from "./TrackerModifications";

export interface TrackerState {
    state: State,
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
    | { type: 'reset', settings: TypedOptions2 | undefined };

export const trackerReducer = (state: TrackerState, action: TrackerAction): TrackerState => {
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
            const count = state.state.inventory[item] ?? 0;
            let newCount = action.take ? count - 1 : count + 1;
            if (newCount < 0) {
                newCount += max + 1;
            } else if (newCount > max) {
                newCount -= max + 1;
            }

            return produce(state, (draft) => {
                draft.state.hasModifiedInventory = true;
                draft.state.inventory[item] = newCount;
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
                draft.state.settings = action.settings;
                if (!draft.state.hasModifiedInventory) {
                    draft.state.inventory = getInitialItems(action.settings);
                }
            });
        }
        case 'onCheckClick': {
            return produce(state, (draft) => {
                const add = action.markChecked !== undefined ? action.markChecked : !draft.state.checkedChecks.includes(action.check);
                if (add) {
                    draft.state.checkedChecks.push(action.check);
                } else {
                    draft.state.checkedChecks = draft.state.checkedChecks.filter((c) => c !== action.check);
                }
            });
        }
        case 'bulkEditChecks': {
            return produce(state, (draft) => {
                const oldChecks = new Set(draft.state.checkedChecks);
                if (action.check) {
                    for (const check of action.checks) {
                        oldChecks.add(check);
                    }
                } else {
                    for (const check of action.checks) {
                        oldChecks.delete(check);
                    }
                }
                draft.state.checkedChecks = [...oldChecks];
            });
        }
        case 'onAreaClick': {
            return produce(state, (draft) => {
                draft.activeArea = action.area === draft.activeArea ? undefined : action.area;
            });
        }
        case 'mapEntrance': {
            return produce(state, (draft) => {
                draft.state.mappedExits[action.from] = action.to;
            })
        }
        case 'setHint': {
            return produce(state, (draft) => {
                draft.state.hints[action.area] = action.hint;
            })
        }
        case 'setCheckHint': {
            return produce(state, (draft) => {
                draft.state.checkHints[action.checkId] = action.hintItem;
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
            const settings = action.settings ?? state.state.settings;
            return {
                ...state,
                activeArea: undefined,
                state: {
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
        default:
            throw new Error("unreachable");
    }
}
