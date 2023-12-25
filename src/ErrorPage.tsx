import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TrackerState, reset } from './tracker/slice';
import { defaultSettings } from './permalink/Settings';
import { promptRemote } from './loader/LogicLoader';
import { rawLogicSelector, rawOptionsSelector } from './logic/selectors';
import { RootState } from './store/store';
import { RawLogic } from './logic/UpstreamTypes';

export default function ErrorPage({
    error,
    resetErrorBoundary,
}: {
    error: any;
    resetErrorBoundary: () => void;
}) {
    const dispatch = useDispatch();
    const options = useSelector(rawOptionsSelector);
    const logic = useSelector(rawLogicSelector);
    const trackerState = useSelector((state: RootState) => state.tracker);

    const oldLogic = useRef<RawLogic | undefined>(logic);
    const oldTrackerState = useRef<TrackerState | undefined>(trackerState);

    useEffect(() => {
        if (logic !== oldLogic.current || trackerState !== oldTrackerState.current) {
            resetErrorBoundary();
        }
        oldLogic.current = logic;
        oldTrackerState.current = trackerState;
    }, [resetErrorBoundary, logic, trackerState]);

    const doReset = useCallback(() => {
        dispatch(reset({ settings: defaultSettings(options) }));
    }, [dispatch, options]);
    const errorMsg =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        'message' in error ? (error.message as string) : JSON.stringify(error);
    return (
        <div>
            <p>Something went wrong. Try reloading the page, reset the tracker, or load a different logic version:</p>
            <pre style={{ color: 'red' }}>{errorMsg}</pre>
            {options && <button onClick={doReset}>Reset Tracker</button>}
            <button
                onClick={() => {
                    promptRemote(dispatch, undefined, true);
                }}
            >
                Load a different version
            </button>
        </div>
    );
}
