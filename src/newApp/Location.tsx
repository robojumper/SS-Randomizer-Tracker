import { Col, Row } from 'react-bootstrap';
import keyDownWrapper from '../KeyDownWrapper';
import { useDispatch, useTrackerState } from './Context';

export default function Location({
    name,
    id,
    checked,
    inLogic,
}: {
    name: string;
    id: string;
    checked: boolean;
    inLogic: boolean;
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
        color: inLogic ? colorScheme.inLogic : colorScheme.outLogic,
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
            <Row noGutters>
                <Col
                    style={style}
                    id={id}
                    sm={8}
                >
                    {name}
                </Col>
            </Row>
        </div>
    );
}
