import { Modal, Button, Container, Row, Col, FormCheck } from 'react-bootstrap';
import ColorBlock from './ColorBlock';
import ColorScheme, { darkColorScheme, lightColorScheme } from './ColorScheme';
import { ItemLayout, LocationLayout, setColorScheme, setItemLayout, setLocationLayout, setTrickSemiLogic } from './slice';
import { useDispatch, useSelector } from 'react-redux';
import { colorSchemeSelector, itemLayoutSelector, locationLayoutSelector, trickSemiLogicSelector } from './selectors';
import { useCallback } from 'react';
import { selectStyles } from './ComponentStyles';
import Select from 'react-select';

const defaultColorSchemes = {
    Light: lightColorScheme,
    Dark: darkColorScheme,
};

const locationLayouts = [
    {value: 'list', label: 'List Layout'},
    {value: 'map', label: 'Map Layout'}
];
const itemLayouts = [
    {value: 'inventory', label: 'In-Game Inventory'},
    {value: 'grid', label: 'Grid Layout'}
];

export default function CustomizationModal({
    onHide,
    show,
}: {
    show: boolean,
    onHide: () => void,
}) {
    const dispatch = useDispatch();
    const colorScheme = useSelector(colorSchemeSelector);
    const layout = useSelector(itemLayoutSelector);
    const locationLayout = useSelector(locationLayoutSelector);
    const trickSemiLogic = useSelector(trickSemiLogicSelector);

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
                                        style={{ background: scheme.background, color: scheme.text, border: '1px solid var(--scheme-text)' }}
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
                        <h4>Item Tracker Settings</h4>
                    </Row>
                    <Row>
                        <Select
                            styles={selectStyles<
                                false,
                                { label: string; value: string }
                            >()}
                            isSearchable={false}
                            value={itemLayouts.find((l) => l.value === layout)}
                            onChange={(e) => e && dispatch(setItemLayout(e.value as ItemLayout))}
                            options={itemLayouts}
                            name="Item Layout"
                        />
                    </Row>
                    <Row>
                        <h4>Location Tracker Settings</h4>
                    </Row>
                    <Row>
                        <Select
                            styles={selectStyles<
                                false,
                                { label: string; value: string }
                            >()}
                            isSearchable={false}
                            value={locationLayouts.find((l) => l.value === locationLayout)}
                            onChange={(e) => e && dispatch(setLocationLayout(e.value as LocationLayout))}
                            options={locationLayouts}
                            name="Location Layout"
                        />
                    </Row>
                    <Row>
                        <h4>Show Trick Logic</h4>
                    </Row>
                    <Row>
                        <FormCheck
                            type="switch"
                            checked={trickSemiLogic}
                            onChange={(e) => dispatch(setTrickSemiLogic(e.target.checked))}
                        />
                    </Row>
                </Container>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
}

