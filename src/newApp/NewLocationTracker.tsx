import { useMemo, useState } from "react";
import { useTrackerState } from "./Context";
import { Logic } from "./NewLogic";
import { interpretLogic } from "./LogicInterpretation";
import _ from "lodash";
import Location from "./Location";

export function NewLocationTracker({ logic }: { logic: Logic }) {
    const [search, setSearch] = useState('');
    const state = useTrackerState();

    const result = useMemo(() => interpretLogic(logic, state.state), [logic, state.state])

    const checks = useMemo(() => {
        const list = Object.entries(logic.checks);
        const s = search.toLowerCase().trim();
        const filtered = search ? list.filter(([id, name]) => id.toLowerCase().includes(s) || name.toLowerCase().includes(s)) : list;
        const mapped = filtered.map(([checkId, checkName]) => {
            const idx = logic.items[checkId][1];
            const inLogic = result.test(idx);
            const checked = state.state.checkedChecks.includes(checkId);

            return {
                checkId,
                inLogic,
                checked,
                checkName,
            }
        });
        return _.sortBy(mapped, (m) => !m.inLogic, (m) => m.checked)
    }, [logic.checks, logic.items, search, result, state.state.checkedChecks]);

    return (
        <>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div style={{ overflowY: 'scroll', height: '100%' }}>
                {checks.map(({ checkId, checkName, checked, inLogic }) => (
                    <Location key={checkId} id={checkId} checked={checked} inLogic={inLogic} name={checkName} />
                ))}
            </div>
        </>
    );
}