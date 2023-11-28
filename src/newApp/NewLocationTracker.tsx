import { useDerivedState, useTrackerState } from "./Context";
import _ from "lodash";
import LocationGroupHeader from "../locationTracker/LocationGroupHeader";
import LocationGroup from "./LocationGroup";
import '../locationTracker/locationTracker.css'
import { Col, Row } from "react-bootstrap";
import LocationGroupContextMenu from "../locationTracker/LocationGroupContextMenu";

export function NewLocationTracker({ containerHeight }: { containerHeight: number; }) {
    const state = useTrackerState();
    const derivedState = useDerivedState();
    const activeArea = state.activeArea ? derivedState.areas[state.activeArea] : undefined;

    return (
        <Col className="location-tracker">
            <LocationGroupContextMenu />
            <Row style={{ height: containerHeight / 2, overflowY: 'auto', overflowX: 'visible' }}>
                <ul style={{ padding: '2%' }}>
                    {
                        derivedState.regularAreas.map((value) => (
                            <LocationGroupHeader selected={value.name === activeArea?.name} key={value.name} area={value} />
                        ))
                    }
                </ul>
            </Row>
            {
                activeArea && (
                    <Row style={{ height: containerHeight / 2, overflowY: 'auto', overflowX: 'visible' }}>
                        <LocationGroup locations={activeArea.checks} colorScheme={state.colorScheme} />
                    </Row>
                )
            }
        </Col>
    );
}