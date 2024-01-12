import { CSSProperties, MouseEvent, useCallback } from 'react';
import Tippy from '@tippyjs/react';
import { followCursor } from 'tippy.js';
import 'react-contexify/dist/ReactContexify.css';
import AreaCounters from '../AreaCounters';
import ColorScheme from '../../customization/ColorScheme';
import keyDownWrapper from '../../KeyDownWrapper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { areaHintSelector, areasSelector } from '../../tracker/selectors';
import HintDescription, { decodeHint } from '../Hints';
import { useContextMenu } from '../context-menu';
import { LocationGroupContextMenuProps } from '../LocationGroupHeader';

type MapMarkerProps = {
    markerX: number;
    markerY: number;
    title: string;
    onGlickGroup: (region: string) => void;
    mapWidth: number;
    expandedGroup: string | undefined;
};

const MapMarker = (props: MapMarkerProps) => {
    
    const { onGlickGroup, title, markerX, markerY, mapWidth, expandedGroup} = props;
    const area = useSelector((state: RootState) => areasSelector(state).find((a) => a.name === title))!;
    const remainingChecks = area?.numChecksRemaining;
    const accessibleChecks = area?.numChecksAccessible;
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

    const { show } = useContextMenu<LocationGroupContextMenuProps>({
        id: 'group-context',
    });

    const displayMenu = useCallback((e: MouseEvent) => {
        show({ event: e, props: { area } });
    }, [area, show]);

    const areaHint = useSelector(areaHintSelector(title));
    const hint = areaHint && decodeHint(areaHint);

    const markerStyle: CSSProperties = {
        position: 'absolute',
        top: `${markerY}%`,
        left: `${markerX}%`,
        borderRadius: (title.includes('Silent Realm') ? '200px' : '8px'),
        background: `var(--scheme-${markerColor})`,
        color: 'black',
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
            {hint && <HintDescription hint={hint} />}
        </center>
    )

    const handleClick = (e: React.UIEvent) => {
        if (e.type === 'contextmenu') {
            onGlickGroup(title);
            e.preventDefault();
        } else {
            onGlickGroup(title);
        }
    };

    return (
        <div>
            <Tippy content={tooltip} placement="bottom" followCursor plugins={[followCursor]} offset={[0, 20]} >
                <div
                    onClick={handleClick}
                    onKeyDown={keyDownWrapper(handleClick)}
                    role="button"
                    tabIndex={0}
                    onContextMenu={displayMenu}
                >
                    <span style={markerStyle} id="marker">
                        {Boolean(accessibleChecks) && accessibleChecks}
                    </span>
                </div>
            </Tippy>
            {expandedGroup === title && area && (
                <div
                    className="flex-container"
                    onClick={handleClick}
                    onKeyDown={keyDownWrapper(handleClick)}
                    tabIndex={0}
                    role="button"
                    onContextMenu={displayMenu}
                    style={{display: 'flex', flexDirection: 'row', width: mapWidth}}
                >
                    <div style={{flexGrow: 1, margin: '2%'}}>
                        <h3>
                            {title}
                        </h3>
                    </div>
                    <div style={{ margin: '1%' }}>
                        <span>
                            {hint && <img src={hint.image} alt={hint.description} />}
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

export default MapMarker;