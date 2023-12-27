import { Col, Row } from 'react-bootstrap';
import keyDownWrapper from '../KeyDownWrapper';
import { useContextMenu } from './context-menu';
import { useCallback } from 'react';
import { TriggerEvent } from 'react-contexify';
import images from '../itemTracker/Images';
import placeholderImg from '../assets/slot test.png';
import '../locationTracker/Location.css';
import Tippy from '@tippyjs/react';
import { useEntrancePath, useTooltipExpr } from '../tooltips/TooltipHooks';
import RequirementsTooltip from './RequirementsTooltip';
import { useDispatch, useSelector } from 'react-redux';
import { checkHintSelector, checkSelector } from '../tracker/selectors';
import { clickCheck } from '../tracker/slice';

export interface LocationContextMenuProps {
    checkId: string;
}

export default function Location({
    id,
}: {
    id: string;
}) {
    const dispatch = useDispatch();
    const hintItem = useSelector(checkHintSelector(id));

    const check = useSelector(checkSelector(id));

    function onClick(e: React.UIEvent) {
        if (!(e.target as Element | null)?.id) {
            return;
        }
        dispatch(clickCheck({ checkId: id }));
    }

    const style = {
        textDecoration: check.checked ? 'line-through' : 'none',
        cursor: 'pointer',
        color: check.checked ? `var(--scheme-checked)` : `var(--scheme-${check.logicalState})`,
        paddingLeft: 6,
        paddingRight: 0,
    };

    const { show } = useContextMenu<LocationContextMenuProps>({
        id: 'location-context',
    });

    const displayMenu = useCallback((e: TriggerEvent) => {
        show({ event: e, props: { checkId: id } });
    }, [id, show]);

    const expr = useTooltipExpr(id);
    const path = useEntrancePath(id);

    return (
        <Tippy content={
            <>
                <RequirementsTooltip requirements={expr} />
                {path}
            </>
        }>
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
                        {check.checkName}
                    </Col>
                    {hintItem && (
                        <Col sm={2} style={{ padding: 0 }}>
                            <img src={images[hintItem]?.[images[hintItem].length - 1] || placeholderImg} height={30} title={hintItem} alt={hintItem} />
                        </Col>
                    )}
                </Row>
            </div>
        </Tippy>
    );
}
