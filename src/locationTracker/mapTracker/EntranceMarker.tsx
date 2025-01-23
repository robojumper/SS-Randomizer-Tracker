import { useSelector } from 'react-redux';
import { useContextMenu } from '../../additionalComponents/contextMenu/ContextMenu';
import type { ColorScheme } from '../../customization/ColorScheme';
import {
    draggableToRegionHint,
    useDroppable,
} from '../../dragAndDrop/DragAndDrop';
import { decodeHint } from '../../hints/Hints';
import { hintsToSubmarkers } from '../../hints/HintsParser';
import { logicSelector } from '../../logic/Selectors';
import type { RootState } from '../../store/Store';
import { useTooltipExpr } from '../../tooltips/TooltipHooks';
import {
    areaHintSelector,
    areasSelector,
    exitsByIdSelector,
    getRequirementLogicalStateSelector,
} from '../../tracker/Selectors';
import HintDescription from '../HintsDescription';
import type {
    LocationGroupContextMenuProps,
    MapExitContextMenuProps,
} from '../LocationGroupContextMenu';
import RequirementsTooltip from '../RequirementsTooltip';
import { getMarkerColor, getRegionData, getSubmarkerData } from './MapUtils';
import { Marker } from './Marker';

function EntranceMarker({
    title,
    exitId,
    markerX,
    markerY,
    submarkerPlacement,
    active,
    onGlickGroup,
    onChooseEntrance,
    selected,
}: {
    markerX: number;
    markerY: number;
    submarkerPlacement: 'left' | 'right';
    exitId: string;
    title: string;
    active: boolean;
    onGlickGroup: (group: string) => void;
    onChooseEntrance: (exitId: string) => void;
    selected: boolean;
}) {
    const exit = useSelector(
        (state: RootState) => exitsByIdSelector(state)[exitId],
    );
    const getRequirementLogicalState = useSelector(
        getRequirementLogicalStateSelector,
    );
    const logic = useSelector(logicSelector);
    const isDungeon = Object.values(
        logic.areaGraph.linkedEntrancePools['dungeons'],
    ).some((ex) => ex.exits[0] === exit.exit.id);

    const region = exit.entrance?.region;
    const area = useSelector((state: RootState) =>
        areasSelector(state).find((r) => r.name === region),
    );

    const hasConnection = area !== undefined;
    const canReach = getRequirementLogicalState(exit.exit.id) === 'inLogic';
    const isUnrequiredDungeon =
        isDungeon &&
        exit.rule.type === 'random' &&
        Boolean(exit.rule.isKnownIrrelevant);

    const data = area && getRegionData(area);
    let markerColor: keyof ColorScheme;
    if (data) {
        markerColor = getMarkerColor(data.checks);
    } else if (canReach && !isUnrequiredDungeon) {
        markerColor = 'inLogic';
    } else {
        markerColor = 'checked';
    }

    const showBound = useContextMenu<MapExitContextMenuProps>(
        isDungeon
            ? isUnrequiredDungeon
                ? 'dungeon-unrequired-context'
                : 'dungeon-context'
            : 'trial-context',
    );

    const showGroup =
        useContextMenu<LocationGroupContextMenuProps>('group-context');

    const destinationRegionName =
        exit.entrance && logic.areaGraph.entranceHintRegions[exit.entrance.id];

    let hints = useSelector(areaHintSelector(destinationRegionName ?? ''));
    const {
        setNodeRef,
        active: draggableActive,
        isOver,
    } = useDroppable(
        destinationRegionName
            ? {
                  type: 'hintRegion',
                  hintRegion: destinationRegionName,
              }
            : undefined,
    );

    const dragPreviewHint =
        draggableActive &&
        destinationRegionName &&
        draggableToRegionHint(draggableActive);
    if (dragPreviewHint && isOver) {
        hints = [...hints, dragPreviewHint];
    }

    // Only calculate tooltip if this region is shown
    const requirements = useTooltipExpr(exit.exit.id, active);

    let tooltip;

    if (data) {
        tooltip = (
            <center>
                <div>{title}</div>
                <div>
                    ↳{region} ({data.checks.numAccessible}/
                    {data.checks.numRemaining})
                </div>
                <div style={{ textAlign: 'left' }}>
                    <RequirementsTooltip requirements={requirements} />
                </div>
                {hints.map((hint, idx) => (
                    <HintDescription key={idx} hint={decodeHint(hint)} />
                ))}
            </center>
        );
    } else {
        tooltip = (
            <center>
                <div>
                    {title} ({canReach ? 'Accessible' : 'Inaccessible'})
                </div>
                <div style={{ textAlign: 'left' }}>
                    <RequirementsTooltip requirements={requirements} />
                </div>
                <div>
                    ↳Click to Attach {isDungeon ? 'Dungeon' : 'Silent Realm'}
                </div>
            </center>
        );
    }

    const onClick = () => {
        if (region) {
            onGlickGroup(region);
        } else {
            onChooseEntrance(exitId);
        }
    };

    const onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (region) {
            if (exit.canAssign) {
                showBound(e, {
                    exitMapping: exit,
                    area: destinationRegionName,
                });
            } else if (destinationRegionName) {
                showGroup(e, {
                    area: destinationRegionName,
                });
            }
        } else if (exit.canAssign) {
            onChooseEntrance(exitId);
        }
    };

    return (
        <Marker
            ref={setNodeRef}
            x={markerX}
            y={markerY}
            variant={title.includes('Trial Gate') ? 'circle' : 'square'}
            color={markerColor}
            tooltip={tooltip}
            onClick={onClick}
            onContextMenu={onContextMenu}
            selected={selected}
            previewStyle={
                dragPreviewHint ? (isOver ? 'hover' : 'droppable') : undefined
            }
            submarkerPlacement={submarkerPlacement}
            submarkers={
                data && [...getSubmarkerData(data), ...hintsToSubmarkers(hints)]
            }
        >
            {Boolean(data?.checks.numAccessible) && data?.checks.numAccessible}
            {!hasConnection && '?'}
        </Marker>
    );
}

export default EntranceMarker;
