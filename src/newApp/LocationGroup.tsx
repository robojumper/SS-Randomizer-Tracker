import _ from 'lodash';
import Location from './Location';
import ColorScheme from '../customization/ColorScheme';
import { Col, Row } from 'react-bootstrap';
import { Check } from './DerivedState';

export default function LocationGroup({
    colorScheme,
    locations,
}: {
    /* the list of locations this group contains */
    locations: Check[],
    colorScheme: ColorScheme,
}) {
    const locationRows = locations.map((location) => (
        <Row key={location.checkId} style={{ paddingTop: '2%', paddingBottom: '2%', border: `1px solid ${colorScheme.text}` }}>
            <Location
                name={location.checkName}
                checked={location.checked}
                id={location.checkId}
                logicalState={location.logicalState}
                hintItem={location.hintItem}
            />
        </Row>
    ));
    return (
        <Col>
            {locationRows}
        </Col>
    );
}
