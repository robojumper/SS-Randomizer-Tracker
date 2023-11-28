import { Col, Row } from 'react-bootstrap';
import keyDownWrapper from '../KeyDownWrapper';
import { useDispatch, useTrackerState } from './Context';
import { LogicalState } from './DerivedState';
import { useContextMenu } from '../locationTracker/context-menu';
import { useCallback } from 'react';
import { TriggerEvent } from 'react-contexify';
import images from '../itemTracker/Images';
import placeholderImg from '../assets/slot test.png';
import '../locationTracker/Location.css';

export interface LocationContextMenuProps {
    checkId: string;
}

export default function Location({
    name,
    id,
    checked,
    logicalState,
    hintItem,
}: {
    name: string;
    id: string;
    checked: boolean;
    logicalState: LogicalState;
    hintItem?: string;
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

    const { show } = useContextMenu<LocationContextMenuProps>({
        id: 'location-context',
    });

    const displayMenu = useCallback((e: TriggerEvent) => {
        show({ event: e, props: { checkId: id } });
    }, [id, show]);

    return (
        <div
            className="location-container"
            onClick={onClick}
            onKeyDown={keyDownWrapper(onClick)}
            role="button"
            tabIndex={0}
            onContextMenu={displayMenu}
        >
            <Row className="g-0">
                <Col
                    style={style}
                    id={id}
                >
                    {name}
                </Col>
                {hintItem && (
                    <Col sm={2} style={{ padding: 0 }}>
                        <img src={images[hintItem]?.[images[hintItem].length - 1] || placeholderImg} height={30} title={hintItem} alt={hintItem} />
                    </Col>
                )}
            </Row>
        </div>
    );
}
