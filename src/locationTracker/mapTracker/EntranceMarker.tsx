import { CSSProperties, useCallback } from 'react';
import Tippy from '@tippyjs/react';
import { followCursor } from 'tippy.js';
import 'react-contexify/dist/ReactContexify.css';
import AreaCounters from '../AreaCounters';
import { useSelector } from 'react-redux';
import { areaHintSelector, areasSelector, exitsSelector, inLogicBitsSelector } from '../../tracker/selectors';
import { useContextMenu } from '../context-menu';
import { TriggerEvent } from 'react-contexify';
import { RootState } from '../../store/store';
import { logicSelector } from '../../logic/selectors';
import ColorScheme from '../../customization/ColorScheme';
import HintDescription, { decodeHint } from '../Hints';
import { ExitMapping } from '../../logic/Locations';
import { useTooltipExpr } from '../../tooltips/TooltipHooks';
import RequirementsTooltip from '../RequirementsTooltip';

type EntranceMarkerProps = {
    markerX: number;
    markerY: number;
    exitId: string;
    title: string;
    mapWidth: number;
    active: boolean;
    expandedGroup: string | undefined;
    onGlickGroup: (group: string) => void;
};

export interface MapExitContextMenuProps {
    exitMapping: ExitMapping;
    /** destination area! */
    area: string | undefined;
};

const EntranceMarker = (props: EntranceMarkerProps) => {
    
    const { title, exitId, markerX, markerY, mapWidth, active, expandedGroup, onGlickGroup } = props;
    const exit = useSelector((state: RootState) => exitsSelector(state).find((e) => e.exit.id === exitId))!;
    const inLogicBits = useSelector(inLogicBitsSelector);
    const logic = useSelector(logicSelector);
    const isDungeon = Object.values(logic.areaGraph.linkedEntrancePools['dungeons']).some((ex) => ex.exits[0] === exit.exit.id);

    const region = exit.entrance?.region;
    const area = useSelector((state: RootState) => areasSelector(state).find((r) => r.name === region))

    const hasConnection = region !== '' && region !== undefined;
    const remainingChecks = area?.numChecksRemaining;
    const accessibleChecks = area?.numChecksAccessible;
    const canReach = inLogicBits.test(logic.itemBits[exit.exit.id]);
    let markerColor: keyof ColorScheme = 'outLogic';
    if (hasConnection) {
        if (accessibleChecks !== 0) {
            markerColor = 'semiLogic';
        }
        if (accessibleChecks === remainingChecks) {
            markerColor = 'inLogic';
        }
        if (remainingChecks === 0) {
            markerColor = 'checked';
        }
    } else if (canReach) {
        markerColor = 'inLogic';
    } else {
        markerColor = 'checked';
    }

    const showUnbound = useContextMenu<MapExitContextMenuProps>({
        id: (isDungeon ? 'unbound-dungeon-context' :  'unbound-trial-context'),
    }).show;

    const showBound = useContextMenu<MapExitContextMenuProps>({
        id: (isDungeon ? 'dungeon-context' :  'trial-context'),
    }).show;

    const destinationRegionName = exit.entrance && logic.areaGraph.entranceHintRegions[exit.entrance.id];

    const displayMenu = useCallback((e: TriggerEvent) => {
        if (hasConnection) {
            showBound({ event: e, props: { exitMapping: exit, area: destinationRegionName } });
        } else {
            showUnbound({ event: e, props: { exitMapping: exit, area: destinationRegionName } });
        }
    }, [destinationRegionName, exit, hasConnection, showBound, showUnbound]);

    const areaHint = useSelector(areaHintSelector(destinationRegionName ?? ''));

    const hint = areaHint && decodeHint(areaHint);

    const markerStyle: CSSProperties = {
        position: 'absolute',
        top: `${markerY}%`,
        left: `${markerX}%`,
        borderRadius: (isDungeon ? '0px' : '200px'),
        background: `var(--scheme-${markerColor})`,
        color: 'black',
        width: mapWidth / 18,
        height: mapWidth / 18,
        border: '2px solid #000000',
        textAlign: 'center',
        fontSize: mapWidth / 27,
        lineHeight: '1.2',
    };

    // Only calculate tooltip if this region is shown
    const requirements = useTooltipExpr(exit.exit.id, active);

    let tooltip;

    if (hasConnection) {
        tooltip = (
            <center>
                <div> {title}</div>
                <div> {region} ({accessibleChecks}/{remainingChecks}) </div>
                <div style={{ textAlign: 'left' }}>
                    <RequirementsTooltip requirements={requirements} />
                </div>
                {hint && <HintDescription hint={hint} />}
            </center>
        )
    } else {
        tooltip = (
            <center>
                <div> {title} ({(canReach ? 'Accessible' : 'Inaccessible')})</div>
                <div style={{ textAlign: 'left' }}>
                    <RequirementsTooltip requirements={requirements} />
                </div>
                <div> Click to Attach {isDungeon ? 'Dungeon' : 'Silent Realm'} </div>
            </center>
        )
    }

    const handleClick = (e: TriggerEvent) => {
        if (e instanceof KeyboardEvent && e.key !== ' ') {
            return;
        }
        if (e.type === 'contextmenu') {
            if (region) {
                onGlickGroup(region);
            }
            e.preventDefault();
        } else if (!hasConnection) {
            displayMenu(e);
        } else {
            onGlickGroup(region);
        }
    };

    return (
        <div>
            <Tippy content={tooltip} placement="bottom" followCursor plugins={[followCursor]} offset={[0, 20]} >
                <div
                    onClick={handleClick}
                    onKeyDown={handleClick}
                    role="button"
                    tabIndex={0}
                    onContextMenu={displayMenu}
                >
                    <span style={markerStyle} id="marker">
                        {(Boolean(accessibleChecks)) && accessibleChecks}
                        {!hasConnection && '?'}
                    </span>
                </div>
            </Tippy>
            {expandedGroup === region && area && (
                <div
                    className="flex-container"
                    onClick={handleClick}
                    onKeyDown={handleClick}
                    tabIndex={0}
                    role="button"
                    onContextMenu={displayMenu}
                    style={{display: 'flex', flexDirection: 'row', width: mapWidth}}
                >
                    <div style={{flexGrow: 1, margin: '2%'}}>
                        <h3>
                            {region}
                        </h3>
                    </div>
                    <div style={{ margin: '1%' }}>
                        <span>
                            {hint && <img style={{ height: '40px' }} src={hint.image} alt={hint.description} />}
                        </span>
                    </div>
                    <div style={{margin: '2%'}}>
                        <h3>
                            <AreaCounters
                                totalChecksLeftInArea={area.numChecksRemaining}
                                totalChecksAccessible={area.numChecksAccessible}
                            />
                        </h3>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EntranceMarker;