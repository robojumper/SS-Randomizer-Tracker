import {
    CSSProperties,
    useMemo,
    useReducer,
    useSyncExternalStore,
} from 'react';
import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import _ from 'lodash';
import ColorScheme from '../customization/ColorScheme';
import CustomizationModal, {
    Layout,
} from '../customization/CustomizationModal';
import { Logic } from './NewLogic';
import ItemTracker from '../itemTracker/ItemTracker';
import GridTracker from '../itemTracker/GridTracker';
import { TrackerState, trackerReducer } from './TrackerReducer';
import { WithContext, useDispatch, useTrackerState } from './Context';
import { NewLocationTracker } from './NewLocationTracker';
import DungeonTracker from '../itemTracker/DungeonTracker';
import BasicCounters from '../BasicCounters';
import { OptionDefs, TypedOptions } from '../permalink/SettingsTypes';
import { defaultSettings } from '../permalink/Settings';
import { Button } from 'react-bootstrap';
import EntranceTracker from '../entranceTracker/EntranceTracker';
import OptionsMenu from './OptionsMenu';
import { getInitialItems } from './TrackerModifications';
import SecondaryLocationTracker from './SecondaryLocationTracker';

function initTrackerState(options: OptionDefs): TrackerState {
    // const path = new URLSearchParams(window.location.search);
    // const source = path.get('source')!;
    const schemeJson = localStorage.getItem('ssrTrackerColorScheme');
    const colorScheme = schemeJson
        ? (JSON.parse(schemeJson) as ColorScheme)
        : new ColorScheme();
    const layout =
        (localStorage.getItem('ssrTrackerLayout') as Layout | null) ??
        'inventory';
    const settings: TypedOptions = {
        ...defaultSettings(options),
        'Randomize Entrances': 'All Surface Dungeons',
    };
    return {
        state: {
            inventory: getInitialItems(settings),
            mappedExits: {},
            checkedChecks: [],
            requiredDungeons: [],
            settings,
            hasModifiedInventory: false,
            hints: {},
        },
        width: window.innerWidth,
        height: window.innerHeight,
        showCustomizationDialog: false,
        colorScheme,
        layout,
        showEntranceDialog: false,
        showOptionsDialog: false,
        activeArea: undefined,
    };
}

function subscribeToWindowResize(callback: () => void) {
    window.addEventListener('resize', callback);
    return () => {
        window.removeEventListener('resize', callback);
    };
}

function useWindowDimensions() {
    const width = useSyncExternalStore(
        subscribeToWindowResize,
        () => window.innerWidth,
    );
    const height = useSyncExternalStore(
        subscribeToWindowResize,
        () => window.innerHeight,
    );

    return useMemo(
        () => ({
            width,
            height,
        }),
        [width, height],
    );
}

export default function NewTrackerContainer({
    logic,
    options,
}: {
    logic: Logic;
    options: OptionDefs;
}) {
    const [trackerState, dispatch] = useReducer(
        trackerReducer,
        options,
        initTrackerState,
    );

    return (
        <WithContext
            logic={logic}
            options={options}
            state={trackerState}
            dispatch={dispatch}
        >
            <NewTracker
                colorScheme={trackerState.colorScheme}
                layout={trackerState.layout}
                options={options}
            />
        </WithContext>
    );
}

function NewTracker({
    options,
    layout,
    colorScheme,
}: {
    options: OptionDefs;
    layout: Layout;
    colorScheme: ColorScheme;
}) {
    const { height, width } = useWindowDimensions();
    const dispatch = useDispatch();
    const state = useTrackerState();

    const itemTrackerStyle: CSSProperties = {
        position: 'fixed',
        width: (12 * width) / 30, // this is supposed to be *a bit* more than 1/3. Min keeps it visible when the window is short
        height,
        left: 0,
        top: 0,
        margin: '1%',
    };
    const gridTrackerStyle: CSSProperties = {
        position: 'fixed',
        width: (2 * width) / 5,
        height,
        left: 0,
        top: 0,
        margin: '1%',
    };

    let itemTracker;
    if (layout === 'inventory') {
        itemTracker = (
            <ItemTracker
                styleProps={itemTrackerStyle}
                colorScheme={colorScheme}
            />
        );
    } else if (layout === 'grid') {
        itemTracker = (
            <GridTracker
                styleProps={gridTrackerStyle}
                colorScheme={colorScheme}
            />
        );
    }

    return (
        <div
            style={{
                height: height * 0.95,
                overflow: 'hidden',
                background: colorScheme.background,
            }}
        >
            <Container fluid>
                <Row>
                    <Col>{itemTracker}</Col>
                    <Col>
                        <NewLocationTracker containerHeight={height * 0.95} />
                    </Col>
                    <Col>
                        <Row className="g-0">
                            <BasicCounters colorScheme={colorScheme} />
                        </Row>
                        <Row className="g-0">
                            <DungeonTracker />
                        </Row>
                        <Row style={{ paddingRight: '10%', paddingTop: '2.5%', height: (height * 0.95) / 2 }} className="g-0">
                            <Col style={{ overflowY: 'scroll', overflowX: 'auto', height: (height * 0.95) - 447 }} className="g-0">
                                <SecondaryLocationTracker
                                    className="overflowAuto"
                                    containerHeight={(height * 0.95) / 2}
                                />
                            </Col>
                        </Row>
                    </Col>
                </Row>
                <Row
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        background: 'lightgrey',
                        width: '100%',
                        padding: '0.5%',
                        height: height * 0.05,
                    }}
                >
                    <Col>
                        <Button
                            variant="primary"
                            onClick={() =>
                                dispatch({
                                    type: 'showCustomizationDialog',
                                    show: true,
                                })
                            }
                        >
                            Customization
                        </Button>
                    </Col>
                    <Col>
                        <Button
                            variant="primary"
                            onClick={() =>
                                dispatch({
                                    type: 'showEntranceDialog',
                                    show: true,
                                })
                            }
                        >
                            Entrances
                        </Button>
                    </Col>
                    <Col>
                        <Button
                            variant="primary"
                            onClick={() =>
                                dispatch({
                                    type: 'showOptionsDialog',
                                    show: true,
                                })
                            }
                        >
                            Options
                        </Button>
                    </Col>
                    <Col>
                        <Button
                            variant="primary"
                            onClick={() => dispatch({ type: 'reset', settings: undefined })}
                        >
                            Reset
                        </Button>
                    </Col>
                </Row>
            </Container>
            <CustomizationModal
                show={state.showCustomizationDialog}
                onHide={() =>
                    dispatch({ type: 'showCustomizationDialog', show: false })
                }
                colorScheme={colorScheme}
                updateColorScheme={(colorScheme) =>
                    dispatch({ type: 'setColorScheme', colorScheme })
                }
                updateLayout={(layout) =>
                    dispatch({ type: 'setLayout', layout })
                }
                selectedLayout={state.layout}
            />
            <EntranceTracker
                show={state.showEntranceDialog}
                onHide={() =>
                    dispatch({ type: 'showEntranceDialog', show: false })
                }
            />
            {state.showOptionsDialog && (
                <OptionsMenu
                    onHide={() =>
                        dispatch({ type: 'showOptionsDialog', show: false })
                    }
                    options={options}
                />
            )}
        </div>
    );
}
