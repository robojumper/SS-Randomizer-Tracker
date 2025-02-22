import { createSelector } from '@reduxjs/toolkit';
import {
    trickSemiLogicSelector,
    trickSemiLogicTrickListSelector,
} from '../customization/Selectors';
import { dungeonNames } from '../logic/Locations';
import { optionsSelector, preInstanceLogicSelector } from '../logic/Selectors';
import { getVisibleTricks } from '../logic/SemiLogic';
import type { Logic2 } from '../logic/logic2/Logic';
import { instantiateRequirements } from '../logic/logic2/Requirement';
import type { RootState } from '../store/Store';
import { settingSelector, settingsSelector } from './SettingsSelector';

const skyKeepRequiredSelector = (state: RootState) => {
    const settings = settingsSelector(state);
    if (!settings['triforce-required']) {
        return false;
    }
    return settings['triforce-shuffle'] !== 'Anywhere';
};

export const requiredDungeonsSelector = createSelector(
    [
        (state: RootState) => state.tracker.requiredDungeons,
        settingSelector('required-dungeon-count'),
        skyKeepRequiredSelector,
    ],
    (selectedRequiredDungeons, numRequiredDungeons, skyKeepRequired) => {
        // Enforce consistent order
        return dungeonNames.filter((d) =>
            d === 'Sky Keep'
                ? skyKeepRequired
                : numRequiredDungeons === 6 ||
                  selectedRequiredDungeons.includes(d),
        );
    },
);

const visibleTricksSelector = createSelector(
    [
        optionsSelector,
        settingsSelector,
        trickSemiLogicSelector,
        trickSemiLogicTrickListSelector,
        requiredDungeonsSelector,
    ],
    getVisibleTricks,
);

export const logicSelector = createSelector(
    [
        preInstanceLogicSelector,
        settingsSelector,
        visibleTricksSelector,
        requiredDungeonsSelector,
    ],
    (staticLogic, settings, visibleTricks, requiredDungeons): Logic2 => {
        return {
            ...staticLogic,
            requirements: instantiateRequirements(
                staticLogic.requirements,
                settings,
                visibleTricks,
                requiredDungeons,
            ),
        };
    },
);
