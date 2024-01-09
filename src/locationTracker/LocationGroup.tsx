import { useSelector } from 'react-redux';
import Location from './Location';
import { Col, Row } from 'react-bootstrap';
import { locationLayoutSelector } from '../customization/selectors';
import _ from 'lodash';

export default function LocationGroup({
    locations,
}: {
    /* the list of locations this group contains */
    locations: string[];
}) {
    const mapMode = useSelector(locationLayoutSelector) === 'map';
    const numColumns = mapMode ? 2 : 1;
    const locationRows = locations.map((location) => (
        <Row
            key={location}
            style={{
                paddingTop: '2%',
                paddingBottom: '2%',
                border: `1px solid var(--scheme-text)`,
            }}
        >
            <Location id={location} />
        </Row>
    ));
    const locationColumns = _.chunk(
        locationRows,
        Math.ceil(_.size(locationRows) / numColumns),
    );
    return (
        <>
            {locationColumns.map((rows, index) => (
                <Col key={index}>{rows}</Col>
            ))}
        </>
    );
}
