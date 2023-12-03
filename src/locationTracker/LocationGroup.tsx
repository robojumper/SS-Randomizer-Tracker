import Location from './Location';
import ColorScheme from '../customization/ColorScheme';
import { Col, Row } from 'react-bootstrap';

export default function LocationGroup({
    colorScheme,
    locations,
}: {
    /* the list of locations this group contains */
    locations: string[],
    colorScheme: ColorScheme,
}) {
    const locationRows = locations.map((location) => (
        <Row key={location} style={{ paddingTop: '2%', paddingBottom: '2%', border: `1px solid ${colorScheme.text}` }}>
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
