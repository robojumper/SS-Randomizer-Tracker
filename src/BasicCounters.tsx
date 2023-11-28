import ColorScheme from './customization/ColorScheme';
import { useDerivedState } from './newApp/Context';

export default function BasicCounters({
    colorScheme,
}: {
    colorScheme: ColorScheme;
}) {
    const state = useDerivedState();
    return (
        <div className="Counters" style={{ color: colorScheme.text }}>
            <p>{`Locations Checked: ${state.numChecked}`}</p>
            <p>{`Locations Accessible: ${state.numAccessible}`}</p>
            <p>{`Locations Remaining: ${state.numRemaining}`}</p>
        </div>
    );
}
