import React, { useContext } from 'react';
import { Logic } from '../logic/Logic';
import { DerivedState, useComputeDerivedState } from './DerivedState';
import { OptionDefs } from '../permalink/SettingsTypes';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';


const DerivedStateContext = React.createContext<DerivedState | null>(null);

export function WithContext({
    logic,
    options,
    children,
}: {
    logic: Logic;
    options: OptionDefs;
    children: React.ReactNode;
}) {
    const trackerState = useSelector((state: RootState) => state.tracker);
    const derivedState = useComputeDerivedState(logic, options, trackerState);

    return (
        <DerivedStateContext.Provider value={derivedState}>
            {children}
        </DerivedStateContext.Provider>
    );
}

export function useDerivedState() {
    return useContext(DerivedStateContext)!;
}
