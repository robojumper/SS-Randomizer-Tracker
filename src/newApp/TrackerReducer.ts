import { produce } from "immer";
import ColorScheme from "../customization/ColorScheme";
import { Layout } from "../customization/CustomizationModal";
import { State, isItem, itemMaxes } from "./State";

export interface TrackerState {
    state: State,
    width: number;
    height: number;
    showCustomizationDialog: boolean;
    colorScheme: ColorScheme;
    layout: Layout;
    showEntranceDialog: boolean;
}


export type TrackerAction =
    | { type: 'onItemClick', item: string, take: boolean }
    | { type: 'onCheckClick', check: string }
    | { type: 'onShowEntranceDialog', show: boolean }

export function trackerReducer(state: TrackerState, action: TrackerAction): TrackerState {
    switch (action.type) {
        case 'onItemClick': {
            if (!isItem(action.item)) {
                throw new Error(`bad item ${action.item}`);
            }
            const item = action.item;
            const max = itemMaxes[item];
            const count = state.state.acquiredItems[item] ?? 0;
            let newCount = action.take ? count - 1 : count + 1;
            if (newCount < 0) {
                newCount += max
            } else if (newCount > max) {
                newCount -= max + 1;
            }

            return produce(state, (draft) => {
                draft.state.acquiredItems[item] = newCount;
            });
        }
        case 'onShowEntranceDialog': {
            return {
                ...state,
                showEntranceDialog: action.show,
            }
        }
        case 'onCheckClick': {
            return produce(state, (draft) => {
                if (draft.state.checkedChecks.includes(action.check)) {
                    draft.state.checkedChecks = draft.state.checkedChecks.filter((c) => c !== action.check);
                } else {
                    draft.state.checkedChecks.push(action.check);
                }
            });
        }
        default:
            throw new Error("unreachable");
    }
}
