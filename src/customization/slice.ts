import {
    getStoredColorScheme,
    getStoredCounterBasis,
    getStoredItemLayout,
    getStoredLocationLayout,
    getStoredTrickSemiLogic,
} from '../LocalStorage';
import ColorScheme, { lightColorScheme } from './ColorScheme';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export type ItemLayout = 'grid' | 'inventory';
export type LocationLayout = 'list' | 'map';
export type CounterBasis = 'logic' | 'semilogic';

export interface CustomizationState {
    colorScheme: ColorScheme;
    itemLayout: ItemLayout;
    locationLayout: LocationLayout;
    trickSemilogic: boolean;
    counterBasis: CounterBasis;
}

const initialState: CustomizationState = {
    colorScheme: lightColorScheme,
    itemLayout: 'inventory',
    locationLayout: 'map',
    trickSemilogic: false,
    counterBasis: 'logic',
};

export function preloadedCustomizationState(): CustomizationState {
    const state = initialState;
    const colorScheme = { ...lightColorScheme, ...getStoredColorScheme() };
    const itemLayout = getStoredItemLayout();
    const locationLayout = getStoredLocationLayout();
    const trickSemilogic = getStoredTrickSemiLogic();
    const counterBasis = getStoredCounterBasis();

    if (colorScheme) {
        state.colorScheme = colorScheme;
    }
    if (itemLayout) {
        state.itemLayout = itemLayout;
    }
    if (locationLayout) {
        state.locationLayout = locationLayout;
    }
    if (trickSemilogic !== undefined) {
        state.trickSemilogic = trickSemilogic;
    }
    if (counterBasis !== undefined) {
        state.counterBasis = counterBasis;
    }
    return state;
}

const customizationSlice = createSlice({
    name: 'customization',
    initialState,
    reducers: {
        setColorScheme: (state, action: PayloadAction<ColorScheme>) => {
            state.colorScheme = action.payload;
        },
        setItemLayout: (state, action: PayloadAction<ItemLayout>) => {
            state.itemLayout = action.payload;
        },
        setLocationLayout: (state, action: PayloadAction<LocationLayout>) => {
            state.locationLayout = action.payload;
        },
        setTrickSemiLogic: (state, action: PayloadAction<boolean>) => {
            state.trickSemilogic = action.payload;
        },
        setCounterBasis: (state, action: PayloadAction<CounterBasis>) => {
            state.counterBasis = action.payload;
        }
    },
});

export const { setColorScheme, setItemLayout, setLocationLayout, setTrickSemiLogic, setCounterBasis } =
    customizationSlice.actions;

export default customizationSlice.reducer;
