import React, { useContext } from "react";
import { TrackerAction, TrackerState } from "./TrackerReducer";

const DispatchContext = React.createContext<React.Dispatch<TrackerAction>>(() => {
    throw new Error("no dispatch provided");
});

const StateContext = React.createContext<TrackerState | null>(null);

export function WithContext({ state, dispatch, children }: { state: TrackerState, dispatch: React.Dispatch<TrackerAction>, children: React.ReactNode }) {
    return <DispatchContext.Provider value={dispatch}>
        <StateContext.Provider value={state}>
            {children}
        </StateContext.Provider>
    </DispatchContext.Provider>
}

export function useDispatch() {
    return useContext(DispatchContext);
}

export function useTrackerState() {
    return useContext(StateContext)!;
}