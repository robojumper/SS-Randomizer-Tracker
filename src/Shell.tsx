import { load } from 'js-yaml';
import { useEffect } from 'react';
import { RawLogic } from './newApp/UpstreamTypes';
import NewTrackerContainer from './Tracker';
import { OptionDefs } from './permalink/SettingsTypes';
import { useDispatch, useSelector } from 'react-redux';
import { loadLogic } from './logic/slice';
import { rawLogicSelector, rawOptionsSelector } from './logic/selectors';
import { acceptSettings } from './tracker/slice';
import { defaultSettings } from './permalink/Settings';

const baseFileUrl = (file: string) =>
    `https://raw.githubusercontent.com/robojumper/ssrando/logic-dump/${file}.yaml`;


const loadFileFromUrl = async (url: string) => {
    const response = await fetch(url);
    return response.text();
};

const loadFile = async <T,>(file: string) => {
    const fileUrl = baseFileUrl(file);
    const data = await loadFileFromUrl(fileUrl);
    return load(data) as T;
};

export default function Shell() {
    const dispatch = useDispatch();

    useEffect(() => {
        const load = async () => {

            const [logic, options] = await Promise.all([
                loadFile<RawLogic>('dump'),
                loadFile<OptionDefs>('options'),
            ]);
            dispatch(acceptSettings({ settings: defaultSettings(options) }))
            dispatch(loadLogic({ logic, options }));
        };

        load();
    }, [dispatch]);

    const logic = useSelector(rawLogicSelector);
    const options = useSelector(rawOptionsSelector);

    if (!logic || !options) {
        return <>Loading...</>;
    }

    return (
        <NewTrackerContainer />
    );
}
