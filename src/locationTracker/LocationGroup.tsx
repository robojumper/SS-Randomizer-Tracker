import Location from './Location';
import { Col, Row } from 'react-bootstrap';

export default function LocationGroup({
    locations,
}: {
    /* the list of locations this group contains */
    locations: string[],
}) {
    const locationRows = locations.map((location) => (
        <Row key={location} style={{ paddingTop: '2%', paddingBottom: '2%', border: `1px solid var(--scheme-text)` }}>
            <Location id={location}
            />
        </Row>
    ));
    return (
        <Col>
            {locationRows}
        </Col>
    );
}
