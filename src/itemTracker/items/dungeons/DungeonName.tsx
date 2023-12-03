import './dungeons.css';
import keyDownWrapper from '../../../KeyDownWrapper';
import { useDispatch, useSelector } from 'react-redux';
import { colorSchemeSelector } from '../../../customization/selectors';
import { dungeonCompletedSelector, requiredDungeonsSelector } from '../../../tracker/selectors';
import { DungeonName as DungeonNameType } from '../../../newApp/DerivedState';
import { RootState } from '../../../store/store';
import { clickDungeonName } from '../../../tracker/slice';

type DungeonNameProps = {
    dungeonAbbr: string;
    dungeonName: DungeonNameType;
};

const DungeonName = (props: DungeonNameProps) => {
    const { dungeonName, dungeonAbbr } = props;
    const colorScheme = useSelector(colorSchemeSelector);
    const required = useSelector((state: RootState) => requiredDungeonsSelector(state).includes(dungeonName))
    const completed = useSelector(dungeonCompletedSelector(dungeonName));
    const dispatch = useDispatch();

    const currentStyle = {
        color: required
            ? colorScheme.required
            : colorScheme.unrequired,
    };

    const completedState = completed
        ? 'complete'
        : 'incomplete';

    const dungeonChange = () => dungeonName !== 'Sky Keep' && dispatch(clickDungeonName({ dungeonName }));

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
