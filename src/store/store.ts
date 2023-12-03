import { configureStore } from '@reduxjs/toolkit';
import customization, {
    preloadedCustomizationState,
} from '../customization/slice';
import tracker from '../tracker/slice';
import logic from '../logic/slice';

export const store = configureStore({
    reducer: {
        logic,
        customization,
        tracker,
    },
    preloadedState: {
        customization: preloadedCustomizationState(),
    },
    // Logic is a mess, which is why it's immutable.
    // Opt out of serializability checks here
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types
                ignoredActions: ['logic/loadLogic'],
                // Ignore these paths in the state
                ignoredPaths: ['logic.logic', 'logic.options'],
            },
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
