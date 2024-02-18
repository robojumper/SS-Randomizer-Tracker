import _ from 'lodash';
import { useCallback } from 'react';
import {
    Menu,
    Item,
    Separator,
    Submenu,
    ItemParams,
    PredicateParams,
} from 'react-contexify';
import { LocationGroupContextMenuProps } from './LocationGroupHeader';
import { bulkEditChecks, mapEntrance, setHint } from '../tracker/slice';
import { MapExitContextMenuProps } from './mapTracker/EntranceMarker';
import { useDispatch, useSelector } from 'react-redux';
import {
    areasSelector,
    checkSelector,
    settingSelector,
    usedEntrancesSelector,
} from '../tracker/selectors';
import { AreaGraph, LinkedEntrancePool } from '../logic/Logic';
import { areaGraphSelector } from '../logic/selectors';
import { bosses } from './Hints';
import { ThunkResult, useAppDispatch } from '../store/store';
import { BirdStatueContextMenuProps } from './mapTracker/Submap';

type AreaCtxProps<T = void> = ItemParams<LocationGroupContextMenuProps, T>;
type ExitCtxProps<T = void> = ItemParams<MapExitContextMenuProps, T>;

type BirdStatueCtxProps<T = void> = ItemParams<BirdStatueContextMenuProps, T>;
interface EntranceData {
    entrance: string;
}

interface BossData {
    boss: number;
}

function checkOrUncheckAll(area: string, markChecked: boolean, onlyInLogic = false): ThunkResult {
    return (dispatch, getState) => {
        let checks = areasSelector(getState()).find(
            (a) => a.name === area,
        )?.checks;

        if (onlyInLogic) {
            checks = checks?.filter(
                (c) => checkSelector(c)(getState()).logicalState === 'inLogic',
            );
        }

        if (checks?.length) {
            dispatch(bulkEditChecks({ checks, markChecked }));
        }
    };
}

function useGroupContextMenuHandlers() {
    const dispatch = useAppDispatch();

    const checkAll = useCallback(
        (params: AreaCtxProps | ExitCtxProps) => {
            params.props!.area &&
                dispatch(checkOrUncheckAll(params.props!.area, true));
        },
        [dispatch],
    );

    const checkAllInLogic = useCallback(
        (params: AreaCtxProps | ExitCtxProps) => {
            params.props!.area &&
                dispatch(checkOrUncheckAll(params.props!.area, true, /* onlyInLogic */ true));
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
        (params: AreaCtxProps<BossData> | ExitCtxProps<BossData>) =>
            params.props!.area &&
            dispatch(
                setHint({
                    areaId: params.props!.area,
                    hint: { type: 'path', index: params.data!.boss },
                }),
            ),
        [dispatch],
    );

    const handleSotsClick = useCallback(
        (params: AreaCtxProps | ExitCtxProps) =>
            params.props!.area &&
            dispatch(
                setHint({
                    areaId: params.props!.area,
                    hint: { type: 'sots' },
                }),
            ),
        [dispatch],
    );

    const handleBarrenClick = useCallback(
        (params: AreaCtxProps | ExitCtxProps) =>
            params.props!.area &&
            dispatch(
                setHint({
                    areaId: params.props!.area,
                    hint: { type: 'barren' },
                }),
            ),
        [dispatch],
    );

    const handleClearClick = useCallback(
        (params: AreaCtxProps | ExitCtxProps) =>
            params.props!.area &&
            dispatch(
                setHint({
                    areaId: params.props!.area,
                    hint: undefined,
                }),
            ),
        [dispatch],
    );

    return {
        checkAll,
        checkAllInLogic,
        uncheckAll,
        handlePathClick,
        handleSotsClick,
        handleBarrenClick,
        handleClearClick,
    };
}

function LocationGroupContextMenu() {
    const randomEntrances = useSelector(settingSelector('randomize-entrances'));
    const randomDungeonEntrances = useSelector(
        settingSelector('randomize-dungeon-entrances'),
    );
    const randomSilentRealms = useSelector(settingSelector('randomize-trials'));

    const dungeonEntranceSetting = randomDungeonEntrances ?? randomEntrances;
    const areDungeonEntrancesRandomized = dungeonEntranceSetting !== 'None';

    const birdSanityOn = useSelector(settingSelector('random-start-statues'));

    const {
        checkAll,
        checkAllInLogic,
        uncheckAll,
        handleBarrenClick,
        handleClearClick,
        handlePathClick,
        handleSotsClick,
    } = useGroupContextMenuHandlers();

    return (
        <>
            <Menu id="group-context">
                <Item onClick={checkAll}>Check All</Item>
                <Item onClick={checkAllInLogic}>Check All In Logic</Item>
                <Item onClick={uncheckAll}>Uncheck All</Item>
                <Separator />
                <Submenu label="Set Path">
                    {_.map(bosses, (bossName, bossIndex) => (
                        <Item
                            key={bossName}
                            onClick={handlePathClick}
                            data={{ boss: bossIndex } satisfies BossData}
                        >
                            {bossName}
                        </Item>
                    ))}
                </Submenu>
                <Item onClick={handleSotsClick}>Set SotS</Item>
                <Item onClick={handleBarrenClick}>Set Barren</Item>
                <Item onClick={handleClearClick}>Clear Hint</Item>
            </Menu>
            <BoundEntranceMenu
                id="dungeon-context"
                pool="dungeons"
                canChooseEntrance={areDungeonEntrancesRandomized}
            />
            <UnboundEntranceMenu id="unbound-dungeon-context" pool="dungeons" />
            <BoundEntranceMenu
                id="trial-context"
                pool="silent_realms"
                canChooseEntrance={randomSilentRealms}
            />
            <UnboundEntranceMenu
                id="unbound-trial-context"
                pool="silent_realms"
            />
            {birdSanityOn && <BirdStatueSanityPillarMenu />}
        </>
    );
}

// Wow it turns out getting any sort of dynamic data into React-Contexify is a massive pain,
// so this is kind of annoying and not as generic but /shrug

// contexify breaks down if items are wrapped in nodes, so this is not a component!!!
function createBindSubmenu(
    areaGraph: AreaGraph,
    usedEntrances: Set<string>,
    pool: LinkedEntrancePool,
    chooseEntrance: (exitId: string, entranceId: string) => void,
    disabled: boolean,
) {
    const name = pool === 'dungeons' ? 'Dungeon' : 'Silent Realm';
    return (
        <Submenu disabled={disabled} label={`Bind ${name} to Entrance`}>
            {Object.entries(areaGraph.linkedEntrancePools[pool]).map(
                ([readableName, exits]) => {
                    const entrance = exits.entrances[0];
                    return (
                        <Item
                            key={readableName}
                            disabled={usedEntrances.has(entrance)}
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
                },
            )}
        </Submenu>
    );
}

function BoundEntranceMenu({
    id,
    pool,
    canChooseEntrance,
}: {
    id: string;
    pool: LinkedEntrancePool;
    canChooseEntrance: boolean;
}) {
    const dispatch = useAppDispatch();
    const areaGraph = useSelector(areaGraphSelector);
    const usedEntrances = useSelector(usedEntrancesSelector);

    const {
        checkAll,
        checkAllInLogic,
        uncheckAll,
        handleBarrenClick,
        handleClearClick,
        handlePathClick,
        handleSotsClick,
    } = useGroupContextMenuHandlers();

    const handleMapEntrance = useCallback(
        (exit: string, entrance: string) =>
            dispatch(
                mapEntrance({
                    from: exit,
                    to: entrance,
                }),
            ),
        [dispatch],
    );

    return (
        <Menu id={id}>
            <Item onClick={checkAll}>Check All</Item>
            <Item onClick={checkAllInLogic}>Check All In Logic</Item>
            <Item onClick={uncheckAll}>Uncheck All</Item>
            <Separator />
            <Submenu label="Set Path">
                {_.map(bosses, (bossName, bossIndex) => (
                    <Item
                        key={bossName}
                        onClick={handlePathClick}
                        data={{ boss: bossIndex } satisfies BossData}
                    >
                        {bossName}
                    </Item>
                ))}
            </Submenu>
            <Item onClick={handleSotsClick}>Set SotS</Item>
            <Item onClick={handleBarrenClick}>Set Barren</Item>
            <Item onClick={handleClearClick}>Clear Hint</Item>
            {createBindSubmenu(
                areaGraph,
                new Set(usedEntrances[pool]),
                pool,
                handleMapEntrance,
                !canChooseEntrance,
            )}
        </Menu>
    );
}

function UnboundEntranceMenu({
    id,
    pool,
}: {
    id: string;
    pool: LinkedEntrancePool;
}) {
    const dispatch = useDispatch();
    const areaGraph = useSelector(areaGraphSelector);
    const usedEntrances = useSelector(usedEntrancesSelector);

    const handleMapEntrance = useCallback(
        (exit: string, entrance: string) =>
            dispatch(
                mapEntrance({
                    from: exit,
                    to: entrance,
                }),
            ),
        [dispatch],
    );

    return (
        <Menu id={id}>
            {createBindSubmenu(
                areaGraph,
                new Set(usedEntrances[pool]),
                pool,
                handleMapEntrance,
                false,
            )}
        </Menu>
    );
}

function BirdStatueSanityPillarMenu() {
    const dispatch = useDispatch();
    const areaGraph = useSelector(areaGraphSelector);

    const handleEntranceClick = useCallback(
        (params: BirdStatueCtxProps<EntranceData>) =>
            dispatch(
                mapEntrance({
                    from: areaGraph.birdStatueSanity[params.props!.province]
                        .exit,
                    to: params.data!.entrance,
                }),
            ),
        [areaGraph.birdStatueSanity, dispatch],
    );

    return (
        <Menu id="birdstatue-context">
            {Object.entries(areaGraph.birdStatueSanity).flatMap(
                ([province, data]) =>
                    data.entrances.map((e) => (
                        <Item
                            key={e}
                            data={{ entrance: e } satisfies EntranceData}
                            onClick={handleEntranceClick}
                            hidden={(
                                args: PredicateParams<BirdStatueContextMenuProps>,
                            ) => args.props!.province !== province}
                        >
                            {areaGraph.entrances[e].short_name}
                        </Item>
                    )),
            )}
        </Menu>
    );
}

export default LocationGroupContextMenu;
