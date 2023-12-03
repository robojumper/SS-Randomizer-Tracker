import { useCallback } from 'react';
import { Col, Row } from 'react-bootstrap';

import AreaCounters from './AreaCounters';

import g1 from '../assets/hints/g1.png';
import scaldera from '../assets/hints/scaldera.png';
import moldarach from '../assets/hints/moldarach.png';
import koloktos from '../assets/hints/koloktos.png';
import tentalus from '../assets/hints/tentalus.png';
import g2 from '../assets/hints/g2.png';
import sotsImage from '../assets/hints/sots.png';
import barrenImage from '../assets/hints/barren.png';

import 'react-contexify/dist/ReactContexify.css';
import clsx from 'clsx';
import keyDownWrapper from '../KeyDownWrapper';
import { TriggerEvent } from 'react-contexify';
import { useContextMenu } from './context-menu';
import { Area } from '../newApp/DerivedState';
import { useSelector } from 'react-redux';
import { colorSchemeSelector } from '../customization/selectors';
import { areaHintSelector } from '../tracker/selectors';

const pathImages = [g1, scaldera, moldarach, koloktos, tentalus, g2];

export interface LocationGroupContextMenuProps {
    area: Area,
}

export default function LocationGroupHeader({
    area,
    selected,
    setActiveArea,
}: {
    area: Area,
    selected: boolean,
    setActiveArea: (area: string) => void,
}) {
    const colorScheme = useSelector(colorSchemeSelector);
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

    let image;
    if (areaHint?.type === 'path') {
        image = <img src={pathImages[areaHint.index]} alt="path" />;
    } else if (areaHint?.type === 'sots') {
        image = <img src={sotsImage} alt="sots" />;
    } else if (areaHint?.type === 'barren') {
        image = <img src={barrenImage} alt="barren" />;
    }

    return (
        <Row
            className={clsx('group-container', { selected })}
            onClick={onClick}
            onKeyDown={keyDownWrapper(onClick)}
            role="button"
            tabIndex={0}
            onContextMenu={displayMenu}
        >
            <Col sm={7}>
                <h3 style={{ cursor: 'pointer', color: colorScheme.text }}>
                    {area.name}
                </h3>
            </Col>
            <Col sm={2} style={{ color: colorScheme.text }}>
                <span>{image}</span>
            </Col>
            <Col sm={1}>
                <h3>
                    <AreaCounters
                        totalChecksLeftInArea={area.numChecksRemaining}
                        totalChecksAccessible={area.numChecksAccessible}
                        colorScheme={colorScheme}
                    />
                </h3>
            </Col>
        </Row>
    );
}
