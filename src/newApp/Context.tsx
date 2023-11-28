import React, { useContext } from 'react';
import { TrackerAction, TrackerState } from './TrackerReducer';
import { Logic } from './NewLogic';
import { DerivedState, useComputeDerivedState } from './DerivedState';
import { OptionDefs } from '../permalink/SettingsTypes';

const DispatchContext = React.createContext<React.Dispatch<TrackerAction>>(
    () => {
        throw new Error('no dispatch provided');
    },
);

const StateContext = React.createContext<TrackerState | null>(null);
const DerivedStateContext = React.createContext<DerivedState | null>(null);

export function WithContext({
    logic,
    options: _options,
    state,
    dispatch,
    children,
}: {
    logic: Logic;
    options: OptionDefs;
    state: TrackerState;
    dispatch: React.Dispatch<TrackerAction>;
    children: React.ReactNode;
}) {
    const derivedState = useComputeDerivedState(logic, state.state);

    return (
        <DispatchContext.Provider value={dispatch}>
            <StateContext.Provider value={state}>
                <DerivedStateContext.Provider value={derivedState}>
                    {children}
                </DerivedStateContext.Provider>
            </StateContext.Provider>
        </DispatchContext.Provider>
    );
}

export function useDispatch() {
    return useContext(DispatchContext);
}

export function useTrackerState() {
    return useContext(StateContext)!;
}

export function useDerivedState() {
    return useContext(DerivedStateContext)!;
}
