import { CSSProperties, useCallback } from 'react';
import Tippy from '@tippyjs/react';
import { followCursor } from 'tippy.js';
import _ from 'lodash';
import ColorScheme from '../../customization/ColorScheme';
import MapMarker from './MapMarker';
import EntranceMarker from './EntranceMarker';
import keyDownWrapper from '../../KeyDownWrapper';
import leaveSkyloft from '../../assets/maps/leaveSkyloft.png';
import leaveFaron from '../../assets/maps/leaveFaron.png';
import leaveEldin from '../../assets/maps/leaveEldin.png';
import leaveLanayru from '../../assets/maps/leaveLanayru.png';
import { useSelector } from 'react-redux';
import { areasSelector, exitsSelector } from '../../tracker/selectors';
import { AreaGraph, Logic } from '../../logic/Logic';
import { logicSelector } from '../../logic/selectors';
import HintDescription, { DecodedHint, decodeHint } from '../Hints';
import { RootState } from '../../store/store';

export type RegionMarkerParams = {
    region: string,
    markerX: number,
    markerY: number,
};

export type EntranceMarkerParams = {
    exitPool: keyof AreaGraph['entrancePools']
    entryName: string;
    markerX: number,
    markerY: number,
};

export type ExitParams = {
    image: string,
    width: number,
    left: number,
    top: number
}

type SubmapProps = {
    markerX: number;
    markerY: number;
    title: string;
    onGroupChange: (region: string | undefined) => void;
    onSubmapChange: (submap: string | undefined) => void;
    markers: RegionMarkerParams[];
    entranceMarkers: EntranceMarkerParams[];
    activeSubmap: string | undefined;
    map: string;
    mapWidth: number;
    exitParams: ExitParams;
    expandedGroup: string | undefined;
};

const images = new Map<string, string>([
    ['leaveSkyloft', leaveSkyloft],
    ['leaveFaron', leaveFaron],
    ['leaveEldin', leaveEldin],
    ['leaveLanayru', leaveLanayru],
]);

function getExit(logic: Logic, marker: EntranceMarkerParams) {
    const exitId = logic.areaGraph.entrancePools[marker.exitPool][marker.entryName].exits[0];
    return { exitId, exitName: logic.areaGraph.exits[exitId].short_name };
}

const Submap = (props: SubmapProps) => {
    let remainingChecks = 0
    let accessibleChecks = 0;
    const subregionHints: { hint: DecodedHint, key: string }[] = [];
    const { onSubmapChange, onGroupChange, title, markerX, markerY, mapWidth, activeSubmap, markers, entranceMarkers, exitParams, expandedGroup} = props;
    const areas = useSelector(areasSelector);
    const exits = useSelector(exitsSelector);
    const hints = useSelector((state: RootState) => state.tracker.hints);
    _.forEach(markers, (marker) => {
        const area = areas.find((area) => area.name === marker.region);
        if (area) {
            remainingChecks += area.numChecksRemaining;
            accessibleChecks += area.numChecksAccessible;
            const hint = hints[area.name];
            if (hint) {
                subregionHints.push({ key: area.name, hint: decodeHint(hint) });
            }
        }
    })

    const logic = useSelector(logicSelector);
    
    _.forEach(entranceMarkers, (marker) => {
        const exit = getExit(logic, marker);
        const exitMapping = exits.find((e) => e.exit.id === exit.exitId)!;
        const areaName = exitMapping.entrance && logic.areaGraph.entranceHintRegions[exitMapping.entrance.id];
        const area = areas.find((area) => area.name === areaName);
        if (area) {
            remainingChecks += area.numChecksRemaining;
            accessibleChecks += area.numChecksAccessible;
            const hint = hints[area.name];
            if (hint) {
                subregionHints.push({ key: area.name, hint: decodeHint(hint) });
            }
        }
    })

    let markerColor: keyof ColorScheme = 'outLogic';
    if (accessibleChecks !== 0) {
        markerColor = 'semiLogic';
    }
    if (accessibleChecks === remainingChecks) {
        markerColor = 'inLogic';
    }
    if (remainingChecks === 0) {
        markerColor = 'checked';
    }

    const markerStyle: CSSProperties = {
        position: 'absolute',
        top: `${markerY}%`,
        left: `${markerX}%`,
        borderRadius: '5px',
        background: `var(--scheme-${markerColor})`,
        width: mapWidth / 18,
        height: mapWidth / 18,
        border: '2px solid #000000',
        textAlign: 'center',
        fontSize: mapWidth / 27,
        lineHeight: '1.2',
    };

    const tooltip = (
        <center>
            <div> {title} ({accessibleChecks}/{remainingChecks}) </div>
            <div> Click to Expand </div>
            {subregionHints.map(({hint, key}) => <HintDescription key={key} hint={hint} />)}
        </center>
    )

    const handleClick = (e: React.UIEvent) => {
        if (e.type === 'contextmenu') {
            onSubmapChange(title);
            e.preventDefault();
        } else {
            onSubmapChange(title);
        }
    };

    const handleBack = useCallback(() => onSubmapChange(undefined), [onSubmapChange]);

    const markerElement = (
        <Tippy content={tooltip} placement="bottom" followCursor plugins={[followCursor]} offset={[0, 20]} >
            <div
                onClick={handleClick}
                onKeyDown={keyDownWrapper(handleClick)}
                role="button"
                tabIndex={0}
            >
                <span style={markerStyle} id="marker">
                    {(accessibleChecks > 0) && accessibleChecks}
                </span>
            </div>
        </Tippy>
    );

    const mapElement = (
        <div>
            <img src={props.map} alt={`${title} Map`} width={mapWidth} style={{position: 'relative'}}/>
            {markers.map((marker) => (
                <MapMarker
                    key={marker.region}
                    markerX={marker.markerX}
                    markerY={marker.markerY}
                    title={marker.region}
                    mapWidth={mapWidth}
                    expandedGroup={expandedGroup}
                    onGlickGroup={onGroupChange}
                />
            ))}
            {entranceMarkers.map((entrance) => {
                const { exitId, exitName } = getExit(logic, entrance);
                return (
                    <EntranceMarker
                        key={exitId}
                        markerX={entrance.markerX}
                        markerY={entrance.markerY}
                        title={exitName}
                        mapWidth={mapWidth}
                        expandedGroup={expandedGroup}
                        exitId={exitId}
                        onGlickGroup={onGroupChange}
                    />
                );
            })}
            <div
                onKeyDown={keyDownWrapper(handleBack)}
                onClick={handleBack}
                role="button"
                tabIndex={0}
            >
                <img alt="Back to Sky" src={images.get(exitParams.image)} width={exitParams.width * mapWidth / 100} style={{position: 'absolute', left: `${exitParams.left}%`, top: `${exitParams.top}%`}}/>
            </div>
        </div>
    );
    
    return (
        <div className="submap">
            <div style={{display:(title === activeSubmap ? '' : 'none')}}>
                {mapElement}
            </div>
            <div style={{display:(!activeSubmap ? '' : 'none')}}>
                {markerElement}
            </div>
        </div>
    );
};

export default Submap;
