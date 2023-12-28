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
    optimisticLogicBitsSelector,
    inSemiLogicBitsSelector,
    settingSelector,
    settingsRequirementsSelector,
    inLogicBitsSelector,
} from '../tracker/selectors';
import { logicSelector } from '../logic/selectors';
import {
    RootTooltipExpression,
    booleanExprToTooltipExpr,
} from './TooltipExpression';
import _ from 'lodash';
import { LogicalExpression } from '../logic/bitlogic/LogicalExpression';

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

export function useEntrancePath(checkId: string): string[] | undefined {
    const logic = useSelector(logicSelector);
    const exits = useSelector(exitsSelector);
    const inLogicBits = useSelector(inLogicBitsSelector);
    const optimisticLogicBits = useSelector(optimisticLogicBitsSelector);
    const entranceRando =
        useSelector(settingSelector('randomize-entrances')) === 'All';

    return useMemo(() => {
        if (!entranceRando) {
            return undefined;
        }

        // If all the items in the world can't help us get there, then we probably
        // need to discover more entrances first, so don't show a misleading exit path
        if (!optimisticLogicBits.test(logic.itemBits[checkId])) {
            return undefined;
        }

        try {
            // TODO Move to a selector
            // Take the logical exits and add the map exit/entrances mappings
            const edges: Record<
                string,
                {
                    from: string;
                    requirements: LogicalExpression;
                    location?: string;
                }[]
            > = _.mapValues(logic.areaGraph.logicalExitsToArea, (arr) => [
                ...arr,
            ]);

            for (const exit of exits) {
                if (!exit.entrance) {
                    continue;
                }
                const requirements =
                    logic.areaGraph.mapExitRequirements[exit.exit.id];
                (edges[
                    logic.areaGraph.areasByEntrance[exit.entrance.id].name
                ] ??= []).push({
                    from: logic.areaGraph.areasByExit[exit.exit.id].name,
                    requirements:
                        requirements ??
                        LogicalExpression.true(logic.bitLogic.numBits),
                    location: exit.exit.id,
                });
            }

            // TODO Move to a selector end

            const checkInLogic = inLogicBits.test(logic.itemBits[checkId]);

            // A very simple BFS. Maybe we can have a heuristic for how long
            // it takes to get from one entrance to an exit and use Dijkstra's?
            const path: Record<
                string,
                [parentArea: string, location: string | undefined]
            > = {};
            const goalArea = logic.areaGraph.areaByLocation[checkId];
            // A list of areas to explore
            const workList: string[] = [goalArea];
            const seen = new Set([goalArea]);
            while (workList.length) {
                const v = workList.pop()!;
                if (v === '') {
                    let v_ = v;
                    const pathSegments = ['Start'];
                    do {
                        v_ = path[v_]?.[0];
                        const loc = path[v_]?.[1];
                        if (loc) {
                            pathSegments.push(
                                logic.areaGraph.exits[loc]?.short_name ??
                                logic.checks[loc]?.name);
                        }
                    } while (v_);
                    return pathSegments.length > 1 ? pathSegments : undefined;
                } else {
                    // v is either a check or an exit - explore all entrances
                    if (edges[v]) {
                        for (const edge of edges[v]) {
                            // If our check is in logic, find a path that is in logic, otherwise find any path.
                            if (!seen.has(edge.from)) {
                                seen.add(edge.from);
                                if (
                                    !checkInLogic ||
                                    edge.requirements.eval(inLogicBits)
                                ) {
                                    path[edge.from] = [v, edge.location];
                                    workList.unshift(edge.from);
                                }
                            }
                        }
                    }
                }
            }
            return ['No path found'];
        } catch {
            return ['Error computing exit path!'];
        }
    }, [entranceRando, logic, exits, checkId, inLogicBits, optimisticLogicBits]);
}
