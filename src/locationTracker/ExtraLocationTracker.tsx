import _ from 'lodash';
import { Row, Col } from 'react-bootstrap';
import Location from './Location';
import { useSelector } from 'react-redux';
import { areasSelector } from '../tracker/selectors';


export default function SecondaryLocationTracker({
    className,
    containerHeight,
    activeArea,
}: {
    className: string;
    containerHeight: number;
    activeArea: string | undefined;
}) {
    const areas = useSelector(areasSelector);

    const checks = areas.find((area) => area.name === activeArea)?.extraChecks;

    if (checks === undefined) {
        return null;
    }

    const locationChunks = _.chunk(checks, Math.ceil((_.size(checks) / 2)));
    const arrangedLocations = _.zip(...locationChunks);
    const locationRows = _.map(arrangedLocations, (locationRow, index) => (
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
    ));
    return (
        <Col className={`cube-tracker ${className}`} style={{ height: containerHeight / 2 }}>
            {locationRows}
        </Col>
    );
}
