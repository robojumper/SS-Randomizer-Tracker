import { ChangeEvent, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/store';
import { TrackerState, loadTracker } from './tracker/slice';

const version = 'SSRANDO-TRACKER-NG-V1';

export interface ExportState {
    version: string;
    state: TrackerState;
}

export default function ImportExport() {
    const state = useSelector((state: RootState) => state.tracker);
    const dispatch = useDispatch();

    useEffect(() => {
        localStorage.setItem('ssrTrackerState', JSON.stringify(state));
    }, [state]);

    const doImport = (text: string) => {
        const importVal = JSON.parse(text) as ExportState;
        if (importVal.version !== version) {
            alert('This export was made with an incompatible version of the Tracker and cannot be imported here.');
        }
        dispatch(loadTracker(importVal.state));
    };
    const doExport = () => {
        const filename = `SS-Rando-Tracker${new Date().toISOString()}`;
        const exportVal: ExportState = { state, version };
        const exportstring = JSON.stringify(exportVal, undefined, '\t');
        const blob = new Blob([exportstring], { type: 'json' });
        const e = document.createEvent('MouseEvents'); const
            a = document.createElement('a');
        a.download = `${filename}.json`;
        a.href = window.URL.createObjectURL(blob);
        a.dataset.downloadurl = ['json', a.download, a.href].join(':');
        e.initEvent('click');
        a.dispatchEvent(e);
    };


    const readFile = (event: ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) {
            return;
        }
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (e) => {
            if (!e.target?.result) {
                return;
            }
            doImport(e.target.result.toString())
        };
    }

    return (
        <div id="ImportExport">
            <button type="button" onClick={doExport}>Export Tracker</button>
            <input id="fileInput" type="file" accept=".json" onChange={readFile} />
        </div>
    );
}
