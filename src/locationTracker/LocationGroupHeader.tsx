import { useCallback } from 'react';
import { Col, Row } from 'react-bootstrap';

import AreaCounters from './AreaCounters';

import 'react-contexify/dist/ReactContexify.css';
import keyDownWrapper from '../KeyDownWrapper';
import { TriggerEvent } from 'react-contexify';
import { useContextMenu } from './context-menu';
import { HintRegion } from '../logic/Locations';
import { useSelector } from 'react-redux';
import { areaHintSelector } from '../tracker/selectors';
import { decodeHint } from './Hints';

export interface LocationGroupContextMenuProps {
    area: HintRegion,
}

export default function LocationGroupHeader({
    area,
    setActiveArea,
}: {
    area: HintRegion,
    setActiveArea: (area: string) => void,
}) {
    const onClick = useCallback(
        () => setActiveArea(area.name),
        [area.name, setActiveArea],
    );

    const areaHint = useSelector(areaHintSelector(area.name));

    const { show } = useContextMenu<LocationGroupContextMenuProps>({
        id: 'group-context',
    });

    const displayMenu = useCallback(
        (e: TriggerEvent) => {
            show({
                event: e,
                props: { area },
            });
        },
        [area, show],
    );

    const hint = areaHint && decodeHint(areaHint);

    return (
        <Row
            className={'group-container'}
            onClick={onClick}
            onKeyDown={keyDownWrapper(onClick)}
            role="button"
            tabIndex={0}
            onContextMenu={displayMenu}
        >
            <Col sm={7}>
                <h3 style={{ cursor: 'pointer' }}>
                    {area.name}
                </h3>
            </Col>
            <Col sm={2}>
                <span>
                    {hint && <img src={hint.image} alt={hint.description} />}
                </span>
            </Col>
            <Col sm={1}>
                <h3>
                    <AreaCounters
                        totalChecksLeftInArea={area.numChecksRemaining}
                        totalChecksAccessible={area.numChecksAccessible}
                    />
                </h3>
            </Col>
        </Row>
    );
}
