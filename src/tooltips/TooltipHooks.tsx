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
    settingsRequirementsSelector,
    inLogicPathfindingSelector,
    optimisticPathfindingSelector,
    getRequirementLogicalStateSelector,
    settingSelector,
    settingsSelector,
} from '../tracker/selectors';
import { logicSelector } from '../logic/selectors';
import {
    RootTooltipExpression,
    booleanExprToTooltipExpr,
} from './TooltipExpression';
import { ExplorationNode } from '../logic/Pathfinding';
import { trickSemiLogicSelector, trickSemiLogicTrickListSelector } from '../customization/selectors';
import { mergeRequirements } from '../logic/bitlogic/BitLogic';

const TooltipsContext = createContext<TooltipComputer | null>(null);

/**
 * A context and cache for the tooltip expressions.
 */
export function MakeTooltipsAvailable({ children }: { children: ReactNode }) {
    const [analyzer, setAnalyzer] = useState<TooltipComputer | null>(null);

    const logic = useSelector(logicSelector);
    const settings = useSelector(settingsSelector);
    const settingsRequirements = useSelector(settingsRequirementsSelector);
    const expertMode = useSelector(trickSemiLogicSelector);
    const consideredTricks = useSelector(trickSemiLogicTrickListSelector);

    useEffect(() => {
        const bitLogic = mergeRequirements(
            logic.numRequirements,
            logic.staticRequirements,
            settingsRequirements,
        );
        setAnalyzer(
            new TooltipComputer(logic, settings, expertMode, consideredTricks, bitLogic),
        );
        return () => {
            setAnalyzer((oldAnalyzer) => {
                oldAnalyzer?.destroy();
                return null;
            });
        };
    }, [settingsRequirements, logic, expertMode, consideredTricks, settings]);

    return (
        <TooltipsContext.Provider value={analyzer}>
            {children}
        </TooltipsContext.Provider>
    );
}

/** Compute the tooltip expression for a given check. This will return undefined until results are available. */
export function useTooltipExpr(
    checkId: string,
    active = true,
): RootTooltipExpression | undefined {
    const id = useId();
    const store = useContext(TooltipsContext);
    const logic = useSelector(logicSelector);
    const getRequirementLogicalState = useSelector(
        getRequirementLogicalStateSelector,
    );

    const subscribe = useCallback(
        (callback: () => void) =>
            (active && store?.subscribe(id, checkId, callback)) || noop,
        [active, checkId, id, store],
    );
    const getSnapshot = useCallback(
        () => (active && store?.getSnapshot(checkId)) || undefined,
        [active, checkId, store],
    );
    const booleanExpr = useSyncExternalStore(subscribe, getSnapshot);

    return useMemo(
        () =>
            booleanExpr &&
            booleanExprToTooltipExpr(
                logic,
                booleanExpr,
                getRequirementLogicalState,
            ),
        [booleanExpr, logic, getRequirementLogicalState],
    );
}

export function useEntrancePath(checkId: string): string[] | undefined {
    const logicPathfinding = useSelector(inLogicPathfindingSelector);
    const optimisticPathfinding = useSelector(optimisticPathfindingSelector);
    const entranceRando = useSelector(settingSelector('randomize-entrances'));

    return useMemo(() => {
        if (entranceRando !== 'All') {
            return undefined;
        }

        const path =
            logicPathfinding?.[checkId] ?? optimisticPathfinding?.[checkId];
        if (!path) {
            return undefined;
        }
        const segments = [];
        let node: ExplorationNode | undefined = path;
        do {
            if (node.edge) {
                segments.push(node.edge);
            }
            node = node.parent;
        } while (node !== undefined);
        segments.push('Start');
        return segments.reverse();
    }, [checkId, entranceRando, logicPathfinding, optimisticPathfinding]);
}
