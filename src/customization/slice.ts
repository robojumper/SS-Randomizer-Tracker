import {
    getStoredColorScheme,
    getStoredItemLayout,
    getStoredLocationLayout,
} from '../LocalStorage';
import ColorScheme, { lightColorScheme } from './ColorScheme';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export type ItemLayout = 'grid' | 'inventory';
export type LocationLayout = 'list' | 'map';

export interface CustomizationState {
    colorScheme: ColorScheme;
    itemLayout: ItemLayout;
    locationLayout: LocationLayout;
}

const initialState: CustomizationState = {
    colorScheme: lightColorScheme,
    itemLayout: 'inventory',
    locationLayout: 'list',
};

export function preloadedCustomizationState(): CustomizationState {
    const state = initialState;
    const colorScheme = { ...lightColorScheme, ...getStoredColorScheme() };
    const itemLayout = getStoredItemLayout();
    const locationLayout = getStoredLocationLayout();

    if (colorScheme) {
        state.colorScheme = colorScheme;
    }
    if (itemLayout) {
        state.itemLayout = itemLayout;
    }
    if (locationLayout) {
        state.locationLayout = locationLayout;
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
    },
});

export const { setColorScheme, setItemLayout, setLocationLayout } =
    customizationSlice.actions;

export default customizationSlice.reducer;
