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
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
