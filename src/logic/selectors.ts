import { RootState } from '../store/store';

export const logicSelector = (state: RootState) => state.logic.logic!;
export const optionsSelector = (state: RootState) => state.logic.options!;
