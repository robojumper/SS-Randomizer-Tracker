import { ReactNode, createContext, useCallback, useContext, useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { TooltipComputer } from './TooltipComputations';
import { Logic } from '../logic/Logic';
import { State, mapSettings } from './State';
import { OptionDefs } from '../permalink/SettingsTypes';
import { produce } from 'immer';
import { nonRandomizedExits, randomizedExitsToDungeons } from './ThingsThatWouldBeNiceToHaveInTheDump';
import { noop } from 'lodash';
import BooleanExpression from './BooleanExpression';

const TooltipsContext = createContext<TooltipComputer | null>(null);

export function MakeTooltipsAvailable({
    logic,
    options,
    children,
    state,
}: {
    logic: Logic;
    options: OptionDefs,
    children: ReactNode;
    state: State,
}) {
    const [analyzer, setAnalyzer] = useState<TooltipComputer | null>(null);

    const entranceRandomSetting = state.settings['randomize-entrances'];
    const startingEntranceSetting = state.settings['random-start-entrance'];
    const activeVanillaConnections = useMemo(() => {
        let connections: Record<string, string>;
        if (entranceRandomSetting === 'None') {
            connections = logic.areaGraph.vanillaConnections;
        } else {
            connections = Object.fromEntries(
                Object.entries(logic.areaGraph.vanillaConnections).filter(
                    ([from]) =>
                        !randomizedExitsToDungeons.includes(from) &&
                        !nonRandomizedExits.includes(from),
                ),
            );
        }

        if (startingEntranceSetting !== 'Vanilla') {
            connections = produce(connections, (draft) => {
                delete draft['\\Start'];
            });
        }

        return connections;
    }, [
        entranceRandomSetting,
        logic.areaGraph.vanillaConnections,
        startingEntranceSetting,
    ]);

    const implications = useMemo(() => mapSettings(
        logic,
        options,
        state.mappedExits,
        activeVanillaConnections,
        state.settings,
    ), [activeVanillaConnections, logic, options, state.mappedExits, state.settings]);

    useEffect(() => {
        setAnalyzer(new TooltipComputer(logic, implications));
        return () => {
            setAnalyzer((oldAnalyzer) => {
                oldAnalyzer?.destroy();
                return null;
            });
        };
    }, [implications, logic]);

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
