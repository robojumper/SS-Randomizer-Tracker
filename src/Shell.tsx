import { useCallback, useEffect, useState } from 'react';
import TrackerContainer from './Tracker';
import { useDispatch, useSelector } from 'react-redux';
import { loadLogic, setLoadingError } from './logic/slice';
import { rawLogicSelector, rawOptionsSelector } from './logic/selectors';
import { acceptSettings } from './tracker/slice';
import { defaultSettings } from './permalink/Settings';
import { RemoteReference, defaultUpstream, formatRemote, loadRemoteLogic } from './loader/LogicLoader';
import { RootState } from './store/store';
import ErrorPage from './ErrorPage';

export default function Shell() {
    const dispatch = useDispatch();
    const [loadingRemote, setLoadingRemote] = useState<RemoteReference | undefined>();

    const load = useCallback(async (remote: RemoteReference) => {
        setLoadingRemote(remote);
        try {
            const [logic, options] = await loadRemoteLogic(remote);
            dispatch(acceptSettings({ settings: defaultSettings(options), initialLoad: true }))
            dispatch(loadLogic({ logic, options, remote }));
        } catch (e) {
            dispatch(setLoadingError({ error: e ?? 'Unknown error' }));
        } finally {
            setLoadingRemote(undefined);
        }
    }, [dispatch]);

    useEffect(() => {
        const storedRemote = localStorage.getItem('ssrTrackerRemoteLogic');
        const remote = storedRemote !== null ? JSON.parse(storedRemote) as RemoteReference : defaultUpstream;
        load(remote);
    }, [load]);

    const logic = useSelector(rawLogicSelector);
    const options = useSelector(rawOptionsSelector);
    const loadingError = useSelector((state: RootState) => state.logic.error);

    if (!logic || !options) {
        return (
            <>
                {loadingError ? <ErrorPage error={loadingError} resetErrorBoundary={() => undefined} /> : (
                    <>
                        Loading{' '}
                        {loadingRemote ? formatRemote(loadingRemote) : ''}...
                    </>
                )}
            </>
        );
    }

    return (
        <TrackerContainer />
    );
}
