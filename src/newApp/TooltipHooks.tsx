import { ReactNode, createContext, useCallback, useContext, useEffect, useId, useState, useSyncExternalStore } from 'react';
import { TooltipComputer } from './TooltipComputations';
import { noop } from 'lodash';
import BooleanExpression from './BooleanExpression';
import { useSelector } from 'react-redux';
import { settingsImplicationsSelector } from '../tracker/selectors';
import { logicSelector } from '../logic/selectors';

const TooltipsContext = createContext<TooltipComputer | null>(null);

export function MakeTooltipsAvailable({
    children,
}: {
    children: ReactNode;
}) {
    const [analyzer, setAnalyzer] = useState<TooltipComputer | null>(null);

    const logic = useSelector(logicSelector);
    const settingsImplications = useSelector(settingsImplicationsSelector);

    useEffect(() => {
        setAnalyzer(new TooltipComputer(logic, settingsImplications));
        return () => {
            setAnalyzer((oldAnalyzer) => {
                oldAnalyzer?.destroy();
                return null;
            });
        };
    }, [settingsImplications, logic]);

    return (
        <TooltipsContext.Provider value={analyzer}>
            {children}
        </TooltipsContext.Provider>
    );
}

/** Submit a single loadout to analysis. This will return undefined until results are available. */
export function useTooltipExpr(
    checkId: string,
):
    | BooleanExpression
    | undefined {
    const id = useId();
    const store = useContext(TooltipsContext);
    const subscribe = useCallback(
        (callback: () => void) => store?.subscribe(id, checkId, callback) ?? noop,
        [checkId, id, store],
    );
    const getSnapshot = useCallback(
        () =>
            store?.getSnapshot(checkId),
        [checkId, store],
    );
    return useSyncExternalStore(subscribe, getSnapshot);
}
