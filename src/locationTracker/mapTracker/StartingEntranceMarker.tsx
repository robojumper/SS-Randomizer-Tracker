import { CSSProperties, useCallback, useState } from 'react';
import 'react-contexify/dist/ReactContexify.css';
import { useSelector } from 'react-redux';
import { exitsSelector, settingSelector } from '../../tracker/selectors';
import ColorScheme from '../../customization/ColorScheme';
import Tooltip from '../../additionalComponents/Tooltip';
import EntranceSelectionDialog from '../EntranceSelectionDialog';
import keyDownWrapper from '../../KeyDownWrapper';

const StartingEntranceMarker = ({ mapWidth }: { mapWidth: number }) => {
    
    const startingEntranceRando = useSelector(settingSelector('random-start-entrance')) !== 'Vanilla';
    const startMapping = useSelector(exitsSelector).find((e) => e.exit.id === '\\Start')!;
    const [showEntranceDialog, setShowEntranceDialog] = useState(false);
    const showDialog = useCallback(() => setShowEntranceDialog(true), []);

    if (!startingEntranceRando) {
        return null;
    }

    const hasSelectedEntrance = Boolean(startMapping.entrance);

    const markerColor: keyof ColorScheme = hasSelectedEntrance ? 'checked' : 'inLogic';


    const markerStyle: CSSProperties = {
        position: 'absolute',
        top: `${85}%`,
        left: `${40}%`,
        borderRadius: '0px',
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
            <div>Starting Entrance</div>
            <div>Click to choose starting entrance</div>
            {startMapping.entrance  && <div>{startMapping.entrance.name}</div>}
        </center>
    );

    return (
        <>
            <EntranceSelectionDialog exitId={startMapping.exit.id} show={showEntranceDialog} onHide={() => setShowEntranceDialog(false)} />
            <div>
                <Tooltip content={tooltip} placement="bottom" followCursor>
                    <div
                        onClick={showDialog}
                        onKeyDown={keyDownWrapper(showDialog)}
                        role="button"
                        tabIndex={0}
                    >
                        <span style={markerStyle} id="marker">
                            {!hasSelectedEntrance && '?'}
                        </span>
                    </div>
                </Tooltip>
            </div>
        </>
    );
};

export default StartingEntranceMarker;