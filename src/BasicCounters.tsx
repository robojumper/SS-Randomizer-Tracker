import { useSelector } from 'react-redux';
import ColorScheme from './customization/ColorScheme';
import { totalCountersSelector } from './tracker/selectors';

export default function BasicCounters({
    colorScheme,
}: {
    colorScheme: ColorScheme;
}) {
    const state = useSelector(totalCountersSelector);
    return (
        <div className="Counters" style={{ color: colorScheme.text }}>
            <p>{`Locations Checked: ${state.numChecked}`}</p>
            <p>{`Locations Accessible: ${state.numAccessible}`}</p>
            <p>{`Locations Remaining: ${state.numRemaining}`}</p>
        </div>
    );
}
