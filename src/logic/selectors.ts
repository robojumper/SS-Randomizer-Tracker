import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store/store';
import { parseLogic } from './Logic';

const rawLogicSelector = (state: RootState) => state.logic.logic!;
/** Selects loaded options. If not loaded, returns undefined (even if the types don't say so.) */
export const optionsSelector = (state: RootState) => state.logic.options!;

/** A selector that returns true iff logic is loaded. */
export const isLogicLoadedSelector = (state: RootState) => Boolean(rawLogicSelector(state));

/** Select parsed logic. Throws if logic hasn't loaded yet (guard with `isLogicLoadedSelector`). */
export const logicSelector = createSelector([rawLogicSelector], parseLogic);

export const areaGraphSelector = createSelector(
    [logicSelector],
    (logic) => logic.areaGraph,
);
