import { createSelector } from '@reduxjs/toolkit';
import { logicSelector } from '../../tracker/LogicInstanceSelector';
import { exitsByIdSelector } from '../../tracker/Selectors';
import { getMapModel } from './MapModel';

export const mapModelSelector = createSelector(
    [logicSelector, exitsByIdSelector],
    getMapModel,
);
