import _ from 'lodash';
import { useCallback } from 'react';
import { Menu, Item, Separator, Submenu, ItemParams } from 'react-contexify';
import { LocationGroupContextMenuProps } from './LocationGroupHeader';
import { bulkEditChecks, mapEntrance, setHint } from '../tracker/slice';
import { MapExitContextMenuProps } from './mapTracker/EntranceMarker';
import { useDispatch, useSelector } from 'react-redux';
import { areasSelector, remainingEntrancesSelector, settingSelector } from '../tracker/selectors';
import { AreaGraph } from '../logic/Logic';
import { areaGraphSelector } from '../logic/selectors';
import { bosses } from './Hints';
import { ThunkResult, useAppDispatch } from '../store/store';

type AreaCtxProps<T = void> = ItemParams<LocationGroupContextMenuProps, T>;
type ExitCtxProps<T = void> = ItemParams<MapExitContextMenuProps, T>;

interface BossData {
    boss: number;
}

function checkOrUncheckAll(area: string, markChecked: boolean): ThunkResult {
    return (dispatch, getState) => {
        const checks = areasSelector(getState()).find((a) => a.name === area)?.checks;
        if (checks?.length) {
            dispatch(bulkEditChecks({ checks, markChecked }))
        }
    }
}

function LocationGroupContextMenu() {
    const dispatch = useAppDispatch();

    const checkAll = useCallback(
        (params: AreaCtxProps | ExitCtxProps) => {
            params.props!.area &&
                dispatch(checkOrUncheckAll(params.props!.area, true));
        },
        [dispatch],
    );

    const randomEntrances = useSelector(settingSelector('randomize-entrances'));
    const randomDungeonEntrances = useSelector(settingSelector('randomize-dungeon-entrances'));
    const randomSilentRealms = useSelector(settingSelector('randomize-trials'));

    const dungeonEntranceSetting =
        randomDungeonEntrances ?? randomEntrances;
    const areDungeonEntrancesRandomized = dungeonEntranceSetting !== 'None';

    const uncheckAll = useCallback(
        (params: AreaCtxProps | ExitCtxProps) => {
            params.props!.area &&
                dispatch(checkOrUncheckAll(params.props!.area, false));
        },
        [dispatch],
    );

    const handlePathClick = useCallback(
        (params: AreaCtxProps<BossData>) => dispatch(setHint({
            areaId: params.props!.area,
            hint: { type: 'path', index: params.data!.boss },
        })),
        [dispatch],
    );

    const handleSotsClick = useCallback(
        (params: AreaCtxProps) => dispatch(setHint({
            areaId: params.props!.area,
            hint: { type: 'sots' },
        })),
        [dispatch],
    );

    const handleBarrenClick = useCallback(
        (params: AreaCtxProps) => dispatch(setHint({
            areaId: params.props!.area,
            hint: { type: 'barren' },
        })),
        [dispatch],
    );

    const handleClearCheck = useCallback(
        (params: AreaCtxProps) => dispatch(setHint({
            areaId: params.props!.area,
            hint: undefined,
        })),
        [dispatch],
    );

    return (
        <>
            <Menu id="group-context">
                <Item onClick={checkAll}>Check All</Item>
                <Item onClick={uncheckAll}>Uncheck All</Item>
                <Separator />
                <Submenu label="Set Path">
                    {_.map(bosses, (bossName, bossIndex) => (
                        <Item
                            key={bossName}
                            onClick={handlePathClick}
                            data={
                                { boss: bossIndex } satisfies BossData
                            }
                        >
                            {bossName}
                        </Item>
                    ))}
                </Submenu>
                <Item onClick={handleSotsClick}>Set SotS</Item>
                <Item onClick={handleBarrenClick}>Set Barren</Item>
                <Item onClick={handleClearCheck}>Clear Hint</Item>
            </Menu>
            <BoundEntranceMenu id="dungeon-context" pool="dungeons" canChooseEntrance={areDungeonEntrancesRandomized} />
            <UnboundEntranceMenu id="unbound-dungeon-context" pool="dungeons" />
            <BoundEntranceMenu id="trial-context" pool="silent_realms" canChooseEntrance={randomSilentRealms} />
            <UnboundEntranceMenu id="unbound-trial-context" pool="silent_realms" />
        </>
    );
}

// Wow it turns out getting any sort of dynamic data into React-Contexify is a massive pain,
// so this is kind of annoying and not as generic but /shrug

// contexify breaks down if items are wrapped in nodes, so this is not a component!!!
function createBindSubmenu(areaGraph: AreaGraph, remainingEntrances: Set<string>, pool: keyof AreaGraph['entrancePools'], chooseEntrance: (exitId: string, entranceId: string) => void, disabled: boolean) {
    const name = pool === 'dungeons' ? 'Dungeon' : 'Silent Realm';
    return <Submenu disabled={disabled} label={`Bind ${name} to Entrance`}>
        {Object.entries(areaGraph.entrancePools[pool]).map(([readableName, exits]) => {
            const entrance = exits.entrances[0];
            return (
                <Item
                    key={readableName}
                    disabled={!remainingEntrances.has(entrance)}
                    onClick={(params: ExitCtxProps) =>
                        chooseEntrance(
                            params.props!.exitMapping.exit.id,
                            entrance,
                        )
                    }
                >
                    {readableName}
                </Item>
            );
        })}
    </Submenu>
}

function BoundEntranceMenu({ id, pool, canChooseEntrance }: { id: string, pool: keyof AreaGraph['entrancePools'], canChooseEntrance: boolean }) {
    const dispatch = useAppDispatch();
    const areaGraph = useSelector(areaGraphSelector);
    const remainingEntrances = useSelector(remainingEntrancesSelector);

    const checkAll = useCallback(
        (params: AreaCtxProps | ExitCtxProps) => {
            params.props!.area &&
                dispatch(checkOrUncheckAll(params.props!.area, true));
        },
        [dispatch],
    );

    const uncheckAll = useCallback(
        (params: AreaCtxProps | ExitCtxProps) => {
            params.props!.area &&
                dispatch(checkOrUncheckAll(params.props!.area, false));
        },
        [dispatch],
    );

    const handlePathClick = useCallback(
        (params: ExitCtxProps<BossData>) => params.props!.area && dispatch(setHint({
            areaId: params.props!.area,
            hint: { type: 'path', index: params.data!.boss },
        })),
        [dispatch],
    );

    const handleSotsClick = useCallback(
        (params: ExitCtxProps) => params.props!.area && dispatch(setHint({
            areaId: params.props!.area,
            hint: { type: 'sots' },
        })),
        [dispatch],
    );

    const handleBarrenClick = useCallback(
        (params: ExitCtxProps) => params.props!.area && dispatch(setHint({
            areaId: params.props!.area,
            hint: { type: 'barren' },
        })),
        [dispatch],
    );

    const handleClearCheck = useCallback(
        (params: ExitCtxProps) => params.props!.area && dispatch(setHint({
            areaId: params.props!.area,
            hint: undefined,
        })),
        [dispatch],
    );

    const handleMapEntrance = useCallback(
        (exit: string, entrance: string) => dispatch(mapEntrance({
            from: exit,
            to: entrance,
        })),
        [dispatch],
    );

    return (
        <Menu id={id}>
            <Item onClick={checkAll}>Check All</Item>
            <Item onClick={uncheckAll}>Uncheck All</Item>
            <Separator />
            <Submenu label="Set Path">
                {
                    _.map(bosses, (bossName, bossIndex) => (
                        <Item key={bossName} onClick={handlePathClick} data={{ boss: bossIndex } satisfies BossData}>{bossName}</Item>
                    ))
                }
            </Submenu>
            <Item onClick={handleSotsClick}>Set SotS</Item>
            <Item onClick={handleBarrenClick}>Set Barren</Item>
            <Item onClick={handleClearCheck}>Clear Hint</Item>
            {createBindSubmenu(areaGraph, new Set(remainingEntrances.map((e) => e.id)), pool, handleMapEntrance, !canChooseEntrance)}
        </Menu>
    );
}

function UnboundEntranceMenu({ id, pool }: { id: string, pool: keyof AreaGraph['entrancePools'] }) {
    const dispatch = useDispatch();
    const areaGraph = useSelector(areaGraphSelector);
    const remainingEntrances = useSelector(remainingEntrancesSelector);

    const handleMapEntrance = useCallback(
        (exit: string, entrance: string) => dispatch(mapEntrance({
            from: exit,
            to: entrance,
        })),
        [dispatch],
    );

    return (
        <Menu id={id}>
            {createBindSubmenu(areaGraph, new Set(remainingEntrances.map((e) => e.id)), pool, handleMapEntrance, false)}
        </Menu>
    );
}

export default LocationGroupContextMenu;
