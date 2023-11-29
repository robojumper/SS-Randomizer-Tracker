import React, { useContext } from 'react';
import { TrackerAction, AppState } from './TrackerReducer';
import { Logic } from '../logic/Logic';
import { DerivedState, useComputeDerivedState } from './DerivedState';
import { OptionDefs } from '../permalink/SettingsTypes';

const DispatchContext = React.createContext<React.Dispatch<TrackerAction>>(
    () => {
        throw new Error('no dispatch provided');
    },
);

const StateContext = React.createContext<AppState | null>(null);
const DerivedStateContext = React.createContext<DerivedState | null>(null);

export function WithContext({
    logic,
    options,
    state,
    dispatch,
    children,
}: {
    logic: Logic;
    options: OptionDefs;
    state: AppState;
    dispatch: React.Dispatch<TrackerAction>;
    children: React.ReactNode;
}) {
    const derivedState = useComputeDerivedState(logic, options, state.trackerState);

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

export function useAppState() {
    return useContext(StateContext)!;
}

export function useDerivedState() {
    return useContext(DerivedStateContext)!;
}
