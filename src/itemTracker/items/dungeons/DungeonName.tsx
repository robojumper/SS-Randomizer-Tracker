import './dungeons.css';
import keyDownWrapper from '../../../KeyDownWrapper';

type DungeonNameProps = {
    dungeonAbbr: string;
    dungeonName: string;
    completed: boolean;
    dungeonChange: () => void;
};

const DungeonName = (props: DungeonNameProps) => {
    const { dungeonAbbr, completed, dungeonChange } = props;

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
            <p className={completedState}>
                {dungeonAbbr}
            </p>
        </div>
    );
};

export default DungeonName;
