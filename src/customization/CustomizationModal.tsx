import { Modal, Button, Container, Row, Col, FormControl } from 'react-bootstrap';
import ColorBlock from './ColorBlock';
import ColorScheme, { darkColorScheme, lightColorScheme } from './ColorScheme';
import { Layout, setColorScheme, setLayout } from './slice';
import { useDispatch, useSelector } from 'react-redux';
import { colorSchemeSelector, layoutSelector } from './selectors';
import { useCallback } from 'react';

const defaultColorSchemes = {
    Light: lightColorScheme,
    Dark: darkColorScheme,
};

export default function CustomizationModal({
    onHide,
    show,
}: {
    show: boolean,
    onHide: () => void,
}) {
    const dispatch = useDispatch();
    const colorScheme = useSelector(colorSchemeSelector);
    const layout = useSelector(layoutSelector);

    const updateColorScheme = useCallback((scheme: ColorScheme) => dispatch(setColorScheme(scheme)), [dispatch]);

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    Tracker Customization
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="show-grid">
                <Container>
                    <Row>
                        <h4>Presets</h4>
                    </Row>
                    <Row>
                        {
                            Object.entries(defaultColorSchemes).map(([key, scheme]) => (
                                <Col key={key}>
                                    <Button
                                        style={{ background: scheme.background, color: scheme.text, border: '1px solid black' }}
                                        onClick={() => updateColorScheme(scheme)}
                                    >
                                        {key}
                                    </Button>
                                </Col>
                            ))
                        }
                    </Row>
                    <Row>
                        <h4>Colors</h4>
                    </Row>
                    <ColorBlock colorName="Background" schemeKey="background" currentColor={colorScheme.background} colorScheme={colorScheme} updateColorScheme={updateColorScheme} />
                    <ColorBlock colorName="Foreground" schemeKey="text" currentColor={colorScheme.text} colorScheme={colorScheme} updateColorScheme={updateColorScheme} />
                    <ColorBlock colorName="In Logic Check" schemeKey="inLogic" currentColor={colorScheme.inLogic} colorScheme={colorScheme} updateColorScheme={updateColorScheme} />
                    <ColorBlock colorName="Out of Logic Check" schemeKey="outLogic" currentColor={colorScheme.outLogic} colorScheme={colorScheme} updateColorScheme={updateColorScheme} />
                    <ColorBlock colorName="Semi Logic Check" schemeKey="semiLogic" currentColor={colorScheme.semiLogic} colorScheme={colorScheme} updateColorScheme={updateColorScheme} />
                    <ColorBlock colorName="Unrequired Dungeon" schemeKey="unrequired" currentColor={colorScheme.unrequired} colorScheme={colorScheme} updateColorScheme={updateColorScheme} />
                    <ColorBlock colorName="Required Dungeon" schemeKey="required" currentColor={colorScheme.required} colorScheme={colorScheme} updateColorScheme={updateColorScheme} />
                    <ColorBlock colorName="Completed Checks" schemeKey="checked" currentColor={colorScheme.checked} colorScheme={colorScheme} updateColorScheme={updateColorScheme} />
                    <Row>
                        <h4>Tracker Settings</h4>
                    </Row>
                    <Row>
                        <FormControl as="select" value={layout} onChange={(e) => dispatch(setLayout(e.target.value as Layout))}>
                            <option value="inventory">In-Game Inventory</option>
                            <option value="grid">Grid Layout</option>
                        </FormControl>
                    </Row>
                </Container>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
}

