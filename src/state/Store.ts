import { ThunkAction, configureStore } from '@reduxjs/toolkit';
import tracker from './Tracker';
import logic from './Logic';

/**
 * The main Redux store. This pulls in the separate slices from this directory and
 * configures the main store that holds all global application state.
 * The slices are separated as follows:
 * 
 * * logic: Static definitions data, such as the upstream requirements and options definitions
 * * tracker: All tracked data, stuff that should actually be exported and imported.
 * * TODO: customization (layout, color scheme, ...)
 */
export const store = configureStore({
    reducer: {
        logic,
        tracker,
    },
    // FIXME: Make logic a dumb object
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['logic/loadLogic'],
                ignoredPaths: ['logic.logic'],
            },
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type ThunkResult<R = void> = ThunkAction<
    Promise<R>,
    RootState,
    undefined,
    Parameters<AppDispatch>[0]
>;