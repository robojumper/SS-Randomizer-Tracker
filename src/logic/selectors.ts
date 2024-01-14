import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store/store';
import { parseLogic } from './Logic';
import { MultiChoiceOption, OptionDefs } from '../permalink/SettingsTypes';
import { formatRemote } from '../loader/LogicLoader';

export const rawLogicSelector = (state: RootState) => state.logic.logic!;
export const rawOptionsSelector = (state: RootState) => state.logic.options!;


export const logicSelector = createSelector([rawLogicSelector], parseLogic);
export const optionsSelector = createSelector([rawLogicSelector, rawOptionsSelector], (rawLogic, rawOptions) => {
    // Lie a bit about the types here so that we can use the selector in cases where logic may not already have loaded
    if (!rawOptions) {
        return undefined as unknown as OptionDefs;
    }

    const excludedLocsIndex = rawOptions.findIndex(
        (x) => x.command === 'excluded-locations' && x.type === 'multichoice'
    );
    
    
    const choices = Object.values(rawLogic.checks).map((c) => c.short_name);

    const parsedOptions = rawOptions.slice();
    parsedOptions[excludedLocsIndex] = { ...(rawOptions[excludedLocsIndex] as MultiChoiceOption), choices };

    return parsedOptions;
});

export const areaGraphSelector = createSelector(
    [logicSelector],
    (logic) => logic.areaGraph,
);

export const shownLogicUpstreamSelector = createSelector(
    [(state: RootState) => state.logic.remote!],
    formatRemote,
);