import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store/store';

export const colorSchemeSelector = (state: RootState) =>
    state.customization.colorScheme;

export const itemLayoutSelector = (state: RootState) =>
    state.customization.itemLayout;

export const locationLayoutSelector = (state: RootState) =>
    state.customization.locationLayout;

export const trickSemiLogicSelector = (state: RootState) =>
    state.customization.trickSemilogic;

export const trickSemiLogicTrickListSelector = createSelector(
    [(state: RootState) => state.customization.enabledTrickLogicTricks],
    (tricks) => new Set(tricks),
);

export const counterBasisSelector = (state: RootState) =>
    state.customization.counterBasis;