import './dungeons.css';
import keyDownWrapper from '../../../KeyDownWrapper';
import { useAppState } from '../../../newApp/Context';

type DungeonNameProps = {
    dungeonAbbr: string;
    dungeonName: string;
    completed: boolean;
    required: boolean;
    dungeonChange: () => void;
};

const DungeonName = (props: DungeonNameProps) => {
    const { dungeonAbbr, completed, dungeonChange, required } = props;
    const colorScheme = useAppState().colorScheme;

    const currentStyle = {
        color: required
            ? colorScheme.required
            : colorScheme.unrequired,
    };

    const completedState = completed
        ? 'complete'
        : 'incomplete';

    return (
        <div
            onClick={dungeonChange}
            onKeyDown={keyDownWrapper(dungeonChange)}
            role="button"
            tabIndex={0}
        >
            <p className={completedState} style={currentStyle}>
                {dungeonAbbr}
            </p>
        </div>
    );
};

export default DungeonName;
