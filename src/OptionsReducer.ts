import { useEffect, useMemo, useReducer, useState } from 'react';
import {
    AllTypedOptions,
    OptionDefs,
    OptionValue,
    OptionsCommand,
} from './permalink/SettingsTypes';
import { useSelector } from 'react-redux';
import { RootState } from './store/store';
import { totalCountersSelector } from './tracker/selectors';
import { validateSettings } from './permalink/Settings';
import { RemoteReference, loadRemoteLogic } from './loader/LogicLoader';
import { getStoredRemote } from './LocalStorage';
import { withCancel } from './utils/CancelToken';
import _ from 'lodash';
import { RawLogic } from './logic/UpstreamTypes';
import { delay } from './utils/Promises';

const defaultUpstream: RemoteReference = {
    type: 'latestRelease',
};

/**
 * The Options page doesn't directly write its results to Redux, instead
 * it keeps a temporary copy that's either committed or discarded.
 */
export interface OptionsState {
    selectedRemote: RemoteReference;
    settings: Partial<AllTypedOptions>;

    backupRemote: RemoteReference;
    backupSettings: Partial<AllTypedOptions>;
    hasChanges: boolean;
}

export type OptionsAction =
    | {
          type: 'changeSetting';
          command: OptionsCommand;
          value: OptionValue;
      }
    | {
        type: 'changeSettings';
        settings: AllTypedOptions,
    }
    | {
        type: 'selectRemote';
        remote: RemoteReference,
        viaImport?: boolean;
    }
    | {
        type: 'revertChanges';
    };

function initialOptionsState({
    reduxRemote,
    reduxSettings,
}: {
    reduxSettings: Partial<AllTypedOptions>;
    reduxRemote: RemoteReference | undefined;
}): OptionsState {
    const remote = reduxRemote ?? getStoredRemote() ?? defaultUpstream;
    return {
        hasChanges: false,
        selectedRemote: remote,
        backupRemote: remote,
        settings: reduxSettings,
        backupSettings: reduxSettings,
    };
}

function optionsReducer(storedSettings: Partial<AllTypedOptions>) {
    return (state: OptionsState, action: OptionsAction): OptionsState => {
        switch (action.type) {
            case 'changeSetting': {
                const { command, value } = action;
                return {
                    ...state,
                    settings: { ...state.settings, [command]: value },
                    hasChanges: true,
                };
            }
            case 'changeSettings': {
                const { settings } = action;
                return { ...state, settings, hasChanges: true };
            }
            case 'revertChanges': {
                return {
                    ...state,
                    selectedRemote: state.backupRemote,
                    settings: state.backupSettings,
                    hasChanges: false,
                };
            }
            case 'selectRemote': {
                const newState = {
                    ...state,
                    selectedRemote: action.remote,
                    hasChanges: state.hasChanges || !_.isEqual(action.remote, state.selectedRemote),
                };

                if (action.viaImport) {
                    newState.backupRemote = action.remote;
                    newState.settings = storedSettings;
                    newState.backupSettings = storedSettings;
                    newState.hasChanges = false;
                }

                return newState;
            }
        }
    };
}

export type LoadingState =
    | { type: 'loading' }
    | {
          type: 'downloadError';
          error: string;
      };

async function loadRemote(
    remote: RemoteReference,
): Promise<[RawLogic, OptionDefs, string] | string> {
    try {
        return await loadRemoteLogic(remote);
    } catch (e) {
        return e
            ? typeof e === 'object' && 'message' in e
                ? (e.message as string)
                : JSON.stringify(e)
            : 'Unknown error';
    }
}


export function useOptionsState() {
    const reduxLoaded = useSelector(
        (state: RootState) => state.logic.loaded,
    );
    const reduxSettings = useSelector((state: RootState) => state.tracker.settings);
    const [state, dispatch] = useReducer(
        optionsReducer(reduxSettings),
        { reduxRemote: reduxLoaded?.remote, reduxSettings },
        initialOptionsState,
    );

    const completeState = useSelector((state: RootState) => state, {
        devModeChecks: { identityFunctionCheck: 'never' },
    });

    const [loadingState, setLoadingState] = useState<LoadingState | undefined>({
        type: 'loading',
    });

    const [loadedBundle, setLoadedBundle] = useState(reduxLoaded);

    useEffect(() => {
        const [cancelToken, cancel] = withCancel();

        if (_.isEqual(state.selectedRemote, loadedBundle?.remote)) {
            setLoadingState(undefined);
            return undefined;
        }

        (async () => {
            await delay(500);
            if (!cancelToken.canceled) {
                setLoadingState({ type: 'loading' });
                const result = await loadRemote(state.selectedRemote);
                if (!cancelToken.canceled) {
                    if (typeof result === 'string') {
                        setLoadingState({
                            type: 'downloadError',
                            error: result,
                        });
                    } else {
                        const [logic, options, remoteName] = result;
                        setLoadingState(undefined);
                        setLoadedBundle({
                            logic,
                            options,
                            remote: state.selectedRemote,
                            remoteName,
                        });
                    }
                }
            }
        })();

        return cancel;
    }, [dispatch, loadedBundle?.remote, state.selectedRemote]);

    const validatedSettings = useMemo(
        () => loadedBundle && validateSettings(loadedBundle.options, state.settings),
        [loadedBundle, state.settings],
    );

    const continueCounters = useMemo(() => {
        if (!loadedBundle || !completeState.tracker.hasBeenModified) {
            return undefined;
        }
        const mergedState: RootState = {
            customization: completeState.customization,
            tracker: { ...completeState.tracker, settings: state.settings },
            logic: {
                loaded: loadedBundle,
            },
        };
        return totalCountersSelector(mergedState);
    }, [completeState.customization, completeState.tracker, loadedBundle, state.settings]);

    return {
        dispatch,
        loadingState,
        hasChanges: state.hasChanges,
        counters: continueCounters,
        settings: validatedSettings,
        selectedRemote: state.selectedRemote,
        loaded: loadedBundle,
    };
}
