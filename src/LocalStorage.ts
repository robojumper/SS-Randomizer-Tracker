import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
    colorSchemeSelector,
    itemLayoutSelector,
    locationLayoutSelector,
} from './customization/selectors';
import { RootState } from './store/store';
import { TrackerState } from './tracker/slice';
import { RemoteReference, formatRemote, parseRemote } from './loader/LogicLoader';
import { ItemLayout, LocationLayout } from './customization/slice';
import ColorScheme from './customization/ColorScheme';

const itemLayoutLocalStorageKey = 'ssrTrackerLayout';
const colorSchemeLocalStorageKey = 'ssrTrackerColorScheme';
const trackerStateLocalStorageKey = 'ssrTrackerState';
const locationLayoutLocalStorageKey = 'ssrTrackerLocationLayout';
const remoteLogicLocalStorageKey = 'ssrTrackerRemoteLogic';


export function useSyncTrackerStateToLocalStorage() {
    const colorScheme = useSelector(colorSchemeSelector);
    const itemLayout = useSelector(itemLayoutSelector);
    const locationLayout = useSelector(locationLayoutSelector);
    const rawRemote = useSelector((state: RootState) => state.logic.remote!);
    const state = useSelector((state: RootState) => state.tracker);

    useEffect(() => {
        localStorage.setItem(trackerStateLocalStorageKey, JSON.stringify(state));
    }, [state]);


    useEffect(() => {
        localStorage.setItem(
            colorSchemeLocalStorageKey,
            JSON.stringify(colorScheme),
        );
    }, [colorScheme]);

    useEffect(() => {
        localStorage.setItem(itemLayoutLocalStorageKey, itemLayout);
    }, [itemLayout]);

    useEffect(() => {
        localStorage.setItem(locationLayoutLocalStorageKey, locationLayout);
    }, [locationLayout]);

    useEffect(() => {
        localStorage.setItem(
            remoteLogicLocalStorageKey,
            JSON.stringify(rawRemote),
        );
    }, [rawRemote]);
}

export function getStoredTrackerState(): Partial<TrackerState> | undefined {
    const stateJson = localStorage.getItem(trackerStateLocalStorageKey);
    return stateJson ? JSON.parse(stateJson) as Partial<TrackerState> : undefined;
}

const logicMigrations: Record<string, string> = {
    'robojumper/logic-dump': 'robojumper/logic-v2.1.1',
    'robojumper/statuesanity': 'ssrando/main',
    'YourAverageLink/random-pillar-statue': 'ssrando/main',
};

export function getStoredRemote(): RemoteReference | undefined {
    const storedRemote = localStorage.getItem(remoteLogicLocalStorageKey);
    if (storedRemote === null) {
        return undefined;
    }
    const theRemote = JSON.parse(storedRemote) as RemoteReference;
    const migration = logicMigrations[formatRemote(theRemote)];
    if (migration) {
        return parseRemote(migration)!;
    } else {
        return theRemote;
    }
}

export function getStoredItemLayout(): ItemLayout | undefined {
    const itemLayout = (localStorage.getItem(itemLayoutLocalStorageKey) as ItemLayout | null);
    return itemLayout ?? undefined;
}

export function getStoredLocationLayout(): LocationLayout | undefined {
    const locationLayout = (localStorage.getItem(locationLayoutLocalStorageKey) as LocationLayout | null);
    return locationLayout ?? undefined;
}

export function getStoredColorScheme(): Partial<ColorScheme> | undefined {
    const schemeJson = localStorage.getItem(colorSchemeLocalStorageKey);
    return schemeJson ? (JSON.parse(schemeJson) as Partial<ColorScheme>) : undefined;
}