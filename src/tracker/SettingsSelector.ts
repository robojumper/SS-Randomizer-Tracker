import { createSelector } from '@reduxjs/toolkit';
import { optionsSelector } from '../logic/Selectors';
import { validateSettings } from '../permalink/Settings';
import type { TypedOptions } from '../permalink/SettingsTypes';
import type { RootState } from '../store/Store';
import { currySelector } from '../utils/Redux';

/**
 * Selects ALL settings, even the ones not logically relevant.
 */
export const allSettingsSelector = createSelector(
    [optionsSelector, (state: RootState) => state.tracker.settings],
    validateSettings,
);

/**
 * Selects the current logical settings. This is basically the same
 * thing but differently typed to only provide the subset of logically relevant settings.
 */
export const settingsSelector: (state: RootState) => TypedOptions =
    allSettingsSelector;

/**
 * Selects a particular logical settings value.
 */
export const settingSelector: <K extends keyof TypedOptions>(
    setting: K,
) => (state: RootState) => TypedOptions[K] = currySelector(
    <K extends keyof TypedOptions>(
        state: RootState,
        setting: K,
    ): TypedOptions[K] => settingsSelector(state)[setting],
);
