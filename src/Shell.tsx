import { useCallback, useEffect, useState } from 'react';
import TrackerContainer from './Tracker';
import { useDispatch, useSelector } from 'react-redux';
import { loadLogic } from './logic/slice';
import { rawLogicSelector, rawOptionsSelector } from './logic/selectors';
import { acceptSettings } from './tracker/slice';
import { defaultSettings } from './permalink/Settings';
import { RemoteReference, defaultUpstream, formatRemote, loadRemoteLogic, promptRemote } from './loader/LogicLoader';

export default function Shell() {
    const dispatch = useDispatch();
    const [loadingRemote, setLoadingRemote] = useState<RemoteReference | undefined>();

    const load = useCallback(async () => {
        const storedRemote = localStorage.getItem('ssrTrackerRemoteLogic');
        const remote = storedRemote !== null ? JSON.parse(storedRemote) as RemoteReference : defaultUpstream;
        setLoadingRemote(remote);
        const [logic, options] = await loadRemoteLogic(remote);
        dispatch(acceptSettings({ settings: defaultSettings(options), initialLoad: true }))
        dispatch(loadLogic({ logic, options, remote }));
        setLoadingRemote(undefined);
    }, [dispatch]);

    useEffect(() => {
        load();
    }, [load]);

    const logic = useSelector(rawLogicSelector);
    const options = useSelector(rawOptionsSelector);

    if (!logic || !options) {
        return <>
            Loading {loadingRemote ? formatRemote(loadingRemote) : ''}...
            <br />
            <button onClick={() => promptRemote(dispatch, loadingRemote, true)}>Load a different version</button>
        </>;
    }

    return (
        <TrackerContainer />
    );
}
