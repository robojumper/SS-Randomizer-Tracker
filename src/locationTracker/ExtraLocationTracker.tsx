import _ from 'lodash';
import { Row, Col } from 'react-bootstrap';
import Location from './Location';
import { useSelector } from 'react-redux';
import { areasSelector } from '../tracker/selectors';
import ExtraLocationHeader from './ExtraLocationHeader';
import React from 'react';
import Exit from './Exit';

const headers = {
    tr_cube: ['🎲', 'Goddess Cubes'],
    loose_crystal: ['🌟', 'Loose Gratitude Crystals'],
    gossip_stone: ['💧', 'Gossip Stones'],
};

export default function ExtraLocationTracker({
    activeArea,
    setActiveArea,
}: {
    activeArea: string | undefined;
    setActiveArea: (area: string) => void;
}) {
    const areas = useSelector(areasSelector);
    const area = areas.find((area) => area.name === activeArea);

    if (area === undefined) {
        return null;
    }

    return (
        <Col
            className={`cube-tracker`}
        >
            {Object.entries(area.extraChecks).map(([id, checks]) => {
                const [icon, title] = headers[id as keyof typeof headers];
                const locationChunks = _.chunk(
                    checks,
                    Math.ceil(_.size(checks) / 2),
                );
                const arrangedLocations = _.zip(...locationChunks);
                const locationRows = _.map(
                    arrangedLocations,
                    (locationRow, index) => (
                        <Row key={index}>
                            {_.map(
                                locationRow,
                                (location) =>
                                    location && (
                                        <Col key={location}>
                                            <Location id={location} />
                                        </Col>
                                    ),
                            )}
                        </Row>
                    ),
                );
                return (
                    <React.Fragment key={id}>
                        <ExtraLocationHeader title={title} icon={icon} />
                        {locationRows}
                    </React.Fragment>
                );
            })}
            {area.exits.length > 0 && (
                <>
                    <ExtraLocationHeader title="Exits" icon="🚪" />
                    {area.exits.map((exit, index) => (
                        <Row key={index}>
                            <Col key={exit}>
                                <Exit id={exit} setActiveArea={setActiveArea} />
                            </Col>
                        </Row>
                    ))}
                </>
            )}
        </Col>
    );
}
