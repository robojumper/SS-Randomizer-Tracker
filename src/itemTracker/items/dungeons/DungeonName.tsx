import './dungeons.css';
import keyDownWrapper from '../../../KeyDownWrapper';
import { useDispatch, useSelector } from 'react-redux';
import { dungeonCompletedSelector, requiredDungeonsSelector } from '../../../tracker/selectors';
import { DungeonName as DungeonNameType } from '../../../logic/Locations';
import { RootState } from '../../../store/store';
import { clickDungeonName } from '../../../tracker/slice';

type DungeonNameProps = {
    dungeonAbbr: string;
    dungeonName: DungeonNameType;
    setActiveArea: (area: string) => void;
};

const DungeonName = (props: DungeonNameProps) => {
    const { dungeonName, dungeonAbbr, setActiveArea } = props;
    const required = useSelector((state: RootState) => requiredDungeonsSelector(state).includes(dungeonName))
    const completed = useSelector(dungeonCompletedSelector(dungeonName));
    const dispatch = useDispatch();

    const currentStyle = {
        color: `var(--scheme-${required ? 'required' : 'unrequired'})`,
    };

    const completedState = completed
        ? 'complete'
        : 'incomplete';

    const dungeonChange = () => dungeonName !== 'Sky Keep' && dispatch(clickDungeonName({ dungeonName }));
    const onRightClick = (e: React.UIEvent) => {
        setActiveArea(dungeonName);
        e.preventDefault();
    };

    return (
        <div
            onClick={dungeonChange}
            onKeyDown={keyDownWrapper(dungeonChange)}
            role="button"
            tabIndex={0}
            onContextMenu={onRightClick}
        >
            <span className={`${completedState} dungeonName`} style={currentStyle}>
                {dungeonAbbr}
            </span>
        </div>
    );
};

export default DungeonName;
