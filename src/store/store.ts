import { ThunkAction, configureStore } from '@reduxjs/toolkit';
import customization, {
    preloadedCustomizationState,
} from '../customization/slice';
import tracker, { preloadedTrackerState } from '../tracker/slice';
import logic from '../logic/slice';
import { useDispatch } from 'react-redux';

export const store = configureStore({
    reducer: {
        logic,
        customization,
        tracker,
    },
    preloadedState: {
        customization: preloadedCustomizationState(),
        tracker: preloadedTrackerState(),
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export type ThunkResult<R = void> = ThunkAction<Promise<R>, RootState, undefined, Parameters<AppDispatch>[0]>;
