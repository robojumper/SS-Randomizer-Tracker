import { ChangeEvent, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/store';
import { TrackerState, loadTracker } from './tracker/slice';
import { RemoteReference } from './loader/LogicLoader';
import { Button } from 'react-bootstrap';

const version = 'SSRANDO-TRACKER-NG-V2';

export interface ExportState {
    version: string;
    state: TrackerState;
    logicBranch: RemoteReference;
}

export function ExportButton() {
    const state = useSelector((state: RootState) => state.tracker);
    const logicBranch = useSelector((state: RootState) => state.logic.remote!);

    useEffect(() => {
        localStorage.setItem('ssrTrackerState', JSON.stringify(state));
    }, [state]);

    const doExport = () => {
        const filename = `SS-Rando-Tracker${new Date().toISOString()}`;
        const exportVal: ExportState = { state, version, logicBranch };
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

    return (
        <Button onClick={doExport}>
            Export
        </Button>
    );
}

export function ImportButton({ setLogicBranch }: { setLogicBranch: (branch: RemoteReference) => void }) {
    const dispatch = useDispatch();

    const doImport = (text: string) => {
        const importVal = JSON.parse(text) as ExportState;
        if (importVal.version !== version) {
            alert('This export was made with an incompatible version of the Tracker and cannot be imported here.');
        }
        dispatch(loadTracker(importVal.state));
        setLogicBranch(importVal.logicBranch);
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
        <>
            <label style={{ margin: 0, display: 'contents' }} htmlFor="importButton">
                <div className="btn btn-primary" style={{ display: 'flex', flexFlow: 'row', alignItems: 'center' }}>
                    Import Saved Run
                </div>
            </label>
            <input style={{ display: 'none' }} type="file" id="importButton" accept=".json" onChange={readFile} />
        </>
    );
}
