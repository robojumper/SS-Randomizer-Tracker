import { OptionDefs } from '../permalink/SettingsTypes';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RawLogic } from '../newApp/UpstreamTypes';

export interface LogicState {
    logic: RawLogic | undefined;
    options: OptionDefs | undefined;
}

const initialState: LogicState = {
    logic: undefined,
    options: undefined,
}

const logicSlice = createSlice({
    name: 'logic',
    initialState,
    reducers: {
        loadLogic: (state, action: PayloadAction<{ logic: RawLogic, options: OptionDefs }>) => {
            const { logic, options } = action.payload;
            state.logic = logic;
            state.options = options;
        },
    },
});

export const { loadLogic } = logicSlice.actions;

export default logicSlice.reducer;
