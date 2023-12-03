import { RootState } from '../store/store';

export const colorSchemeSelector = (state: RootState) =>
    state.customization.colorScheme;

export const layoutSelector = (state: RootState) =>
    state.customization.layout;