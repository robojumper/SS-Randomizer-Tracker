import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { optionsSelector } from './logic/selectors';
import { reset } from './tracker/slice';
import { defaultSettings } from './permalink/Settings';
import { promptRemote } from './loader/LogicLoader';

export default function ErrorPage({
    error,
    resetErrorBoundary,
}: {
    error: any;
    resetErrorBoundary: () => void;
}) {
    const dispatch = useDispatch();
    const options = useSelector(optionsSelector);
    const doReset = useCallback(() => {
        dispatch(reset({ settings: defaultSettings(options) }));
        resetErrorBoundary();
    }, [dispatch, options, resetErrorBoundary]);
    const errorMsg =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        'message' in error ? (error.message as string) : JSON.stringify(error);
    return (
        <div>
            <p>Something went wrong:</p>
            <pre style={{ color: 'red' }}>{errorMsg}</pre>
            <button onClick={doReset}>Reset Tracker</button>
            <button onClick={() => promptRemote(dispatch, undefined, true)}>Load a different version</button>
        </div>
    );
}
