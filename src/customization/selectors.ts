import { RootState } from '../store/store';

export const colorSchemeSelector = (state: RootState) =>
    state.customization.colorScheme;

export const itemLayoutSelector = (state: RootState) =>
    state.customization.itemLayout;

export const locationLayoutSelector = (state: RootState) =>
    state.customization.locationLayout;