import { load } from 'js-yaml';
import { useEffect } from 'react';
import { parseLogic } from './logic/Logic';
import { RawLogic } from './newApp/UpstreamTypes';
import NewTrackerContainer from './Tracker';
import { MultiChoiceOption, OptionDefs } from './permalink/SettingsTypes';
import { useDispatch, useSelector } from 'react-redux';
import { loadLogic } from './logic/slice';
import { logicSelector, optionsSelector } from './logic/selectors';
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

            const [rawLogic, options] = await Promise.all([
                loadFile<RawLogic>('dump'),
                loadFile<OptionDefs>('options'),
            ]);

            const mappedLogic = parseLogic(rawLogic);
            const excludedLocs = options.find(
                (x) => x.command === 'excluded-locations' && x.type === 'multichoice'
            ) as MultiChoiceOption | undefined;
            excludedLocs!.choices = Object.values(rawLogic.checks).map((c) => c.short_name);
            dispatch(acceptSettings({ settings: defaultSettings(options) }))
            dispatch(loadLogic({ logic: mappedLogic, options }));
        };

        load();
    }, [dispatch]);

    const logic = useSelector(logicSelector);
    const options = useSelector(optionsSelector);

    if (!logic) {
        return <>Loading...</>;
    }

    return (
        <NewTrackerContainer logic={logic} options={options} />
    );
}
