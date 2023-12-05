import React, { useContext } from 'react';
import { DerivedState, useComputeDerivedState } from './DerivedState';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { logicSelector, optionsSelector } from '../logic/selectors';


const DerivedStateContext = React.createContext<DerivedState | null>(null);

export function WithContext({
    children,
}: {
    children: React.ReactNode;
}) {
    const logic = useSelector(logicSelector);
    const options = useSelector(optionsSelector);
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
