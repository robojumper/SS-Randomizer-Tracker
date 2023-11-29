import { load } from 'js-yaml';
import { useEffect, useMemo, useState } from 'react';
import { parseLogic } from './NewLogic';
import { RawLogic } from './UpstreamTypes';
import NewTrackerContainer from './NewTracker';
import { MultiChoiceOption, OptionDefs } from '../permalink/SettingsTypes';

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
    const [logic, setLogic] = useState<RawLogic | undefined>(undefined);
    const [options, setOptions] = useState<OptionDefs | undefined>(undefined);

    useEffect(() => {
        const load = async () => {
            const logic = await loadFile<RawLogic>('dump');
            setLogic(logic);
            // correctly load the choices for excluded locations
            const settings = await loadFile<OptionDefs>('options');
            const excludedLocs = settings.find(
                (x) => x.name === 'Excluded Locations' && x.type === 'multichoice'
            ) as MultiChoiceOption | undefined;
            excludedLocs!.choices = Object.values(logic.checks).map((c) => c.short_name);
            setOptions(settings);
        };

        load();
    }, []);

    const mappedLogic = useMemo(() => logic && parseLogic(logic), [logic]);

    if (!mappedLogic || !options) {
        return <>Loading...</>;
    }

    return (
        <NewTrackerContainer logic={mappedLogic} options={options} />
    );
}
