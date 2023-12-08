import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { TypedOptions } from '../permalink/SettingsTypes';
import { getInitialItems } from '../logic/TrackerModifications';
import { RegularDungeon } from '../logic/Locations';

export const itemMaxes = {
    'Progressive Sword': 6,
    'Progressive Wallet': 4,
    'Extra Wallet': 3,
    'Progressive Mitts': 2,
    "Water Dragon's Scale": 1,
    'Fireshield Earrings': 1,
    "Goddess's Harp": 1,
    "Farore's Courage": 1,
    "Nayru's Wisdom": 1,
    "Din's Power": 1,
    'Ballad of the Goddess': 1,
    'Song of the Hero': 3,
    Sailcloth: 1,
    'Stone of Trials': 1,
    'Emerald Tablet': 1,
    'Ruby Tablet': 1,
    'Amber Tablet': 1,
    "Cawlin's Letter": 1,
    'Horned Colossus Beetle': 1,
    'Baby Rattle': 1,
    'Gratitude Crystal Pack': 13,
    'Gratitude Crystal': 15,
    'Progressive Slingshot': 2,
    'Progressive Beetle': 4,
    'Bomb Bag': 1,
    'Gust Bellows': 1,
    Whip: 1,
    Clawshots: 1,
    'Progressive Bow': 3,
    'Progressive Bug Net': 2,
    'Sea Chart': 1,
    'Lanayru Caves Small Key': 1,
    'Empty Bottle': 5,
    'Progressive Pouch': 1,
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
    Triforce: 3,
    'Skyview Small Key': 2,
    'Key Piece': 5,
    'Lanayru Mining Facility Small Key': 1,
    'Ancient Cistern Small Key': 2,
    'Sandship Small Key': 2,
    'Fire Sanctuary Small Key': 3,
    'Sky Keep Small Key': 1,
};

export type Items = keyof typeof itemMaxes;

export function isItem(id: string): id is Items {
    return id in itemMaxes;
}

export type Hint =
    | { type: 'barren' }
    | { type: 'sots' }
    | { type: 'path'; index: number };

export interface TrackerState {
    /**
     * Checks we've acquired.
     * Includes regular checks and fake checks for cubes/crystals.
     */
    checkedChecks: string[];
    /**
     * Items we've marked as acquired.
     */
    inventory: Partial<Record<Items, number>>;
    /**
     * Whether we've modified our inventory since we loaded from starting items.
     */
    hasModifiedInventory: boolean;
    /**
     * Exits we've has mapped. Later merged with the vanilla connections depending on settings.
     */
    mappedExits: Record<string, string | undefined>;
    /**
     * Dungeons we've marked as required.
     */
    requiredDungeons: string[];
    /**
     * Hints by area
     */
    hints: Record<string, Hint | undefined>;
    /**
     * Hints by check name
     */
    checkHints: Record<string, string | undefined>;
    /**
     * Fully decoded settings.
     */
    settings: TypedOptions | undefined;
}

const initialState: TrackerState = {
    checkedChecks: [],
    inventory: {},
    hasModifiedInventory: false,
    mappedExits: {},
    requiredDungeons: [],
    hints: {},
    checkHints: {},
    settings: undefined,
};

export function preloadedTrackerState(): TrackerState {
    const stateJson = localStorage.getItem('ssrTrackerState');
    return stateJson ? (JSON.parse(stateJson) as TrackerState) : initialState;
}

const trackerSlice = createSlice({
    name: 'tracker',
    initialState,
    reducers: {
        clickItem: (
            state,
            action: PayloadAction<{ item: Items; take: boolean }>,
        ) => {
            const { item, take } = action.payload;
            if (!isItem(item)) {
                throw new Error(`bad item ${item as string}`);
            }
            if (item === 'Sailcloth') {
                return;
            }

            const max = itemMaxes[item];
            const count = state.inventory[item] ?? 0;
            let newCount = take ? count - 1 : count + 1;
            if (newCount < 0) {
                newCount += max + 1;
            } else if (newCount > max) {
                newCount -= max + 1;
            }
            state.hasModifiedInventory = true;
            state.inventory[item] = newCount;
        },
        clickCheck: (
            state,
            action: PayloadAction<{ checkId: string; markChecked?: boolean }>,
        ) => {
            const { checkId } = action.payload;
            const add =
                action.payload.markChecked !== undefined
                    ? action.payload.markChecked
                    : !state.checkedChecks.includes(checkId);
            if (add) {
                state.checkedChecks.push(checkId);
            } else {
                state.checkedChecks = state.checkedChecks.filter(
                    (c) => c !== checkId,
                );
            }
        },
        clickDungeonName: (
            state,
            action: PayloadAction<{ dungeonName: RegularDungeon }>,
        ) => {
            const { dungeonName } = action.payload;
            if (state.requiredDungeons.includes(dungeonName)) {
                state.requiredDungeons = state.requiredDungeons.filter((c) => c !== dungeonName);
            } else {
                state.requiredDungeons.push(dungeonName);
            }
        },
        bulkEditChecks: (
            state,
            action: PayloadAction<{ checks: string[]; markChecked: boolean }>,
        ) => {
            const { checks, markChecked } = action.payload;
            const oldChecks = new Set(state.checkedChecks);
            if (markChecked) {
                for (const check of checks) {
                    oldChecks.add(check);
                }
            } else {
                for (const check of checks) {
                    oldChecks.delete(check);
                }
            }
            state.checkedChecks = [...oldChecks];
        },
        mapEntrance: (
            state,
            action: PayloadAction<{ from: string; to: string | undefined }>,
        ) => {
            const { from, to } = action.payload;
            state.mappedExits[from] = to;
        },
        setHint: (
            state,
            action: PayloadAction<{ areaId: string; hint: Hint | undefined }>,
        ) => {
            const { areaId, hint } = action.payload;
            state.hints[areaId] = hint;
        },
        setCheckHint: (
            state,
            action: PayloadAction<{
                checkId: string;
                hint: string | undefined;
            }>,
        ) => {
            const { checkId, hint } = action.payload;
            state.checkHints[checkId] = hint;
        },
        acceptSettings: (
            state,
            action: PayloadAction<{ settings: TypedOptions, initialLoad?: boolean }>,
        ) => {
            const { settings, initialLoad } = action.payload;
            if (initialLoad && state.settings) {
                return;
            }
            state.settings = settings;
            if (!state.hasModifiedInventory) {
                state.inventory = getInitialItems(settings);
            }
        },
        reset: (
            state,
            action: PayloadAction<{ settings: TypedOptions | undefined }>,
        ) => {
            const { settings } = action.payload;
            const effectiveSettings = settings ?? state.settings;
            return {
                ...initialState,
                settings: effectiveSettings,
                inventory: effectiveSettings ? getInitialItems(effectiveSettings) : {},
            }
        },
        loadTracker: (
            _state,
            action: PayloadAction<TrackerState>,
        ) => {
            return action.payload;
        },
    },
});

/*


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
    | { type: 'acceptSettings', settings: TypedOptions }
    | { type: 'reset', settings: TypedOptions | undefined }
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
*/

export const { clickItem, clickCheck, clickDungeonName, bulkEditChecks, mapEntrance, acceptSettings, setCheckHint, reset, setHint, loadTracker } = trackerSlice.actions;

export default trackerSlice.reducer;
