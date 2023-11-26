import { load } from 'js-yaml';
import { useEffect, useMemo, useState } from 'react';
import { parseLogic } from './NewLogic';
import { RawLogic } from './UpstreamTypes';
import NewTrackerContainer from './NewTracker';

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

    useEffect(() => {
        const load = async () => {
            const logic = await loadFile<RawLogic>('dump');
            setLogic(logic);
        };

        load();
    }, []);

    const mappedLogic = useMemo(() => logic && parseLogic(logic), [logic]);

    if (!mappedLogic) {
        return <>Loading...</>;
    }

    return (
        <NewTrackerContainer logic={mappedLogic} />
    );
}
