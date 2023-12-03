import ColorScheme, { lightColorScheme } from './ColorScheme';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export type Layout = 'grid' | 'inventory';

export interface CustomizationState {
    colorScheme: ColorScheme;
    layout: Layout;
}

const initialState: CustomizationState = {
    colorScheme: lightColorScheme,
    layout: 'inventory',
};

export function preloadedCustomizationState(): CustomizationState {
    const state = initialState;
    const schemeJson = localStorage.getItem('ssrTrackerColorScheme');
    const colorScheme = schemeJson && (JSON.parse(schemeJson) as ColorScheme)
    const layout =
        (localStorage.getItem('ssrTrackerLayout') as Layout | null) ??
        'inventory';

    if (colorScheme) {
        state.colorScheme = colorScheme;
    }
    if (layout) {
        state.layout = layout;
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
        setLayout: (state, action: PayloadAction<Layout>) => {
            state.layout = action.payload;
        },
    },
});

export const { setColorScheme, setLayout } = customizationSlice.actions;

export default customizationSlice.reducer;
