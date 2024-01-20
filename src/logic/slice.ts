import { OptionDefs } from '../permalink/SettingsTypes';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RawLogic } from './UpstreamTypes';
import { RemoteReference } from '../loader/LogicLoader';

export interface LogicState {
    logic: RawLogic | undefined;
    options: OptionDefs | undefined;
    remote: RemoteReference | undefined;
    remoteName: string | undefined;
}

const initialState: LogicState = {
    logic: undefined,
    options: undefined,
    remote: undefined,
    remoteName: undefined,
};

const logicSlice = createSlice({
    name: 'logic',
    initialState,
    reducers: {
        loadLogic: (
            state,
            action: PayloadAction<{
                logic: RawLogic;
                options: OptionDefs;
                remote: RemoteReference;
                remoteName: string;
            }>,
        ) => {
            const { logic, options, remote, remoteName } = action.payload;
            state.logic = logic;
            state.options = options;
            state.remote = remote;
            state.remoteName = remoteName;
        },
    },
});

export const { loadLogic } = logicSlice.actions;

export default logicSlice.reducer;
