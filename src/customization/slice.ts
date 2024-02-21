import {
    getStoredColorScheme,
    getStoredItemLayout,
    getStoredLocationLayout,
    getStoredTrickSemiLogic,
} from '../LocalStorage';
import ColorScheme, { lightColorScheme } from './ColorScheme';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export type ItemLayout = 'grid' | 'inventory';
export type LocationLayout = 'list' | 'map';

export interface CustomizationState {
    colorScheme: ColorScheme;
    itemLayout: ItemLayout;
    locationLayout: LocationLayout;
    trickSemilogic: boolean;
}

const initialState: CustomizationState = {
    colorScheme: lightColorScheme,
    itemLayout: 'inventory',
    locationLayout: 'map',
    trickSemilogic: false,
};

export function preloadedCustomizationState(): CustomizationState {
    const state = initialState;
    const colorScheme = { ...lightColorScheme, ...getStoredColorScheme() };
    const itemLayout = getStoredItemLayout();
    const locationLayout = getStoredLocationLayout();
    const trickSemilogic = getStoredTrickSemiLogic();

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
        }
    },
});

export const { setColorScheme, setItemLayout, setLocationLayout, setTrickSemiLogic } =
    customizationSlice.actions;

export default customizationSlice.reducer;
