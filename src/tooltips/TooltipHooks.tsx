import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';
import { TooltipComputer } from './TooltipComputations';
import { noop } from 'lodash';
import { useSelector } from 'react-redux';
import {
    exitsSelector,
    inLogicBitsSelector,
    inSemiLogicBitsSelector,
    settingSelector,
    settingsRequirementsSelector,
} from '../tracker/selectors';
import { logicSelector } from '../logic/selectors';
import {
    RootTooltipExpression,
    booleanExprToTooltipExpr,
} from './TooltipExpression';
import _ from 'lodash';

const TooltipsContext = createContext<TooltipComputer | null>(null);

/**
 * A context and cache for the tooltip expressions.
 */
export function MakeTooltipsAvailable({ children }: { children: ReactNode }) {
    const [analyzer, setAnalyzer] = useState<TooltipComputer | null>(null);

    const logic = useSelector(logicSelector);
    const settingsRequirements = useSelector(settingsRequirementsSelector);

    useEffect(() => {
        setAnalyzer(new TooltipComputer(logic, settingsRequirements));
        return () => {
            setAnalyzer((oldAnalyzer) => {
                oldAnalyzer?.destroy();
                return null;
            });
        };
    }, [settingsRequirements, logic]);

    return (
        <TooltipsContext.Provider value={analyzer}>
            {children}
        </TooltipsContext.Provider>
    );
}

/** Compute the tooltip expression for a given check. This will return undefined until results are available. */
export function useTooltipExpr(
    checkId: string,
): RootTooltipExpression | undefined {
    const id = useId();
    const store = useContext(TooltipsContext);
    const logic = useSelector(logicSelector);
    const logicBits = useSelector(inLogicBitsSelector);
    const semiLogicBits = useSelector(inSemiLogicBitsSelector);

    const subscribe = useCallback(
        (callback: () => void) =>
            store?.subscribe(id, checkId, callback) ?? noop,
        [checkId, id, store],
    );
    const getSnapshot = useCallback(
        () => store?.getSnapshot(checkId),
        [checkId, store],
    );
    const booleanExpr = useSyncExternalStore(subscribe, getSnapshot);

    return useMemo(
        () =>
            booleanExpr &&
            booleanExprToTooltipExpr(
                logic,
                booleanExpr,
                logicBits,
                semiLogicBits,
            ),
        [booleanExpr, logic, logicBits, semiLogicBits],
    );
}

export function useEntrancePath(checkId: string): string | undefined {
    const logic = useSelector(logicSelector);
    const exits = useSelector(exitsSelector);
    const inLogicBits = useSelector(inLogicBitsSelector);
    const entranceRando = useSelector(settingSelector('randomize-entrances')) === 'All';

    return useMemo(() => {
        if (!entranceRando) {
            return undefined;
        }

        const entrancesPerLocation = logic.areaGraph.entrancesPerLocation;
        const exitsByEntrance = _.groupBy(
            exits.filter((e) => e.entrance),
            (exit) => exit.entrance!.id,
        );

        // A very simple BFS. Maybe we can have a heuristic for how long
        // it takes to get from one entrance to an exit and use Dijkstra's?
        const path: Record<string, string> = {};
        const workList: string[] = [checkId];
        const seen = new Set([checkId]);
        while (workList.length) {
            const v = workList.pop()!;
            console.log(v);
            if (!entrancesPerLocation[v]) {
                let v_ = v;
                let pathStr = '';
                do {
                    pathStr +=
                        logic.areaGraph.exits[v_]?.short_name ??
                        logic.checks[v_]?.name;
                    v_ = path[v_];
                    if (v_) {
                        pathStr += ' → ';
                    }
                } while (v_);
                return pathStr;
            } else {
                // v is either a check or an exit - explore all entrances
                if (entrancesPerLocation[v]) {
                    for (const entrance of entrancesPerLocation[v]) {
                        if (exitsByEntrance[entrance]) {
                            for (const exit of exitsByEntrance[entrance]) {
                                if (
                                    !seen.has(exit.exit.id) &&
                                    inLogicBits.test(
                                        logic.itemBits[exit.exit.id],
                                    )
                                ) {
                                    seen.add(exit.exit.id);
                                    path[exit.exit.id] = v;
                                    workList.unshift(exit.exit.id);
                                }
                            }
                        }
                    }
                }
            }
        }
        return 'No path found';
    }, [entranceRando, logic, exits, checkId, inLogicBits]);
}
