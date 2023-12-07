import { useSelector } from 'react-redux';
import { totalCountersSelector } from './tracker/selectors';

export default function BasicCounters() {
    const state = useSelector(totalCountersSelector);
    return (
        <div className="Counters">
            <p>{`Locations Checked: ${state.numChecked}`}</p>
            <p>{`Locations Accessible: ${state.numAccessible}`}</p>
            <p>{`Locations Remaining: ${state.numRemaining}`}</p>
        </div>
    );
}
