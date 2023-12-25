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
    inLogicBitsSelector,
    inSemiLogicBitsSelector,
    settingsRequirementsSelector,
} from '../tracker/selectors';
import { logicSelector } from '../logic/selectors';
import {
    RootTooltipExpression,
    booleanExprToTooltipExpr,
} from './TooltipExpression';

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
