import _ from 'lodash';
import { Row, Col } from 'react-bootstrap';
import Location from './Location';
import { useDerivedState, useAppState } from '../newApp/Context';


export default function SecondaryLocationTracker({
    className,
    containerHeight,
}: {
    className: string;
    containerHeight: number
}) {

    const state = useAppState();
    const areas = useDerivedState().areas;
    const area = state.activeArea;

    if (area === undefined) {
        return null;
    }

    const checks = areas[area].extraChecks;

    const locationChunks = _.chunk(checks, Math.ceil((_.size(checks) / 2)));
    const arrangedLocations = _.zip(...locationChunks);
    const locationRows = _.map(arrangedLocations, (locationRow, index) => (
        <Row key={index}>
            {
                _.map(locationRow, (location) => (
                    location && (
                        <Col key={location.checkId}>
                            <Location
                                id={location.checkId} name={location.checkName} checked={location.checked} logicalState={location.logicalState}
                            />
                        </Col>
                    )
                ))
            }
        </Row>
    ));
    return (
        <Col className={`cube-tracker ${className}`} style={{ height: containerHeight / 2 }}>
            {locationRows}
        </Col>
    );
}
