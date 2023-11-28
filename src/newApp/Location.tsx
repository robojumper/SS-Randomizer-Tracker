import { Col, Row } from 'react-bootstrap';
import keyDownWrapper from '../KeyDownWrapper';
import { useDispatch, useTrackerState } from './Context';
import { LogicalState } from './DerivedState';

export default function Location({
    name,
    id,
    checked,
    logicalState,
}: {
    name: string;
    id: string;
    checked: boolean;
    logicalState: LogicalState;
}) {
    const dispatch = useDispatch();
    const colorScheme = useTrackerState().colorScheme;

    function onClick(e: React.UIEvent) {
        if (!(e.target as Element | null)?.id) {
            return;
        }
        dispatch({ type: 'onCheckClick', check: id });
    }

    const style = {
        textDecoration: checked ? 'line-through' : 'none',
        cursor: 'pointer',
        color: checked ? colorScheme.checked : colorScheme[logicalState],
        paddingLeft: 6,
        paddingRight: 0,
    };

    return (
        <div
            className="location-container"
            onClick={onClick}
            onKeyDown={keyDownWrapper(onClick)}
            role="button"
            tabIndex={0}
        >
            <Row className="g-0">
                <Col
                    style={style}
                    id={id}
                >
                    {name}
                </Col>
            </Row>
        </div>
    );
}
