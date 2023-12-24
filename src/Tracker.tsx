import {
    CSSProperties,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';
import { Button } from 'react-bootstrap';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import { useDispatch, useSelector } from 'react-redux';
import BasicCounters from './BasicCounters';
import ImportExport from './ImportExport';
import OptionsMenu from './OptionsMenu';
import EntranceTracker from './entranceTracker/EntranceTracker';
import DungeonTracker from './itemTracker/DungeonTracker';
import GridTracker from './itemTracker/GridTracker';
import ItemTracker from './itemTracker/ItemTracker';
import ExtraLocationTracker from './locationTracker/ExtraLocationTracker';
import { NewLocationTracker } from './locationTracker/LocationTracker';
import { MakeTooltipsAvailable } from './tooltips/TooltipHooks';
import CustomizationModal from './customization/CustomizationModal';
import { colorSchemeSelector, layoutSelector } from './customization/selectors';
import { reset } from './tracker/slice';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorPage from './ErrorPage';
import { shownLogicUpstreamSelector } from './logic/selectors';
import { promptRemote } from './loader/LogicLoader';
import { RootState } from './store/store';

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

export default function TrackerContainer() {
    return (
        <ErrorBoundary FallbackComponent={ErrorPage}>
            <MakeTooltipsAvailable>
                <NewTracker />
            </MakeTooltipsAvailable>
        </ErrorBoundary>
    );
}

function NewTracker() {
    const { height, width } = useWindowDimensions();
    const dispatch = useDispatch();

    const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
    const [showEntranceDialog, setShowEntranceDialog] = useState(false);
    const [showOptionsDialog, setShowOptionsDialog] = useState(false);
    const [activeArea, setActiveArea] = useState<string | undefined>(undefined);

    const colorScheme = useSelector(colorSchemeSelector);
    const layout = useSelector(layoutSelector);
    const rawRemote = useSelector((state: RootState) => state.logic.remote!);
    const remote = useSelector(shownLogicUpstreamSelector);

    useLayoutEffect(() => {
        const html = document.querySelector('html')!;
        Object.entries(colorScheme).forEach(([key, val]) => {
            html.style.setProperty(`--scheme-${key}`, val.toString());
        });
    }, [colorScheme]);

    useEffect(() => {
        localStorage.setItem('ssrTrackerColorScheme', JSON.stringify(colorScheme));
    }, [colorScheme]);

    useEffect(() => {
        localStorage.setItem('ssrTrackerLayout', layout);
    }, [layout]);

    useEffect(() => {
        localStorage.setItem('ssrTrackerRemoteLogic', JSON.stringify(rawRemote));
    }, [rawRemote]);

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
            />
        );
    } else if (layout === 'grid') {
        itemTracker = (
            <GridTracker
                styleProps={gridTrackerStyle}
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
                        <NewLocationTracker
                            activeArea={activeArea}
                            setActiveArea={setActiveArea}
                            containerHeight={height * 0.95}
                        />
                    </Col>
                    <Col>
                        <Row className="g-0">
                            <BasicCounters />
                        </Row>
                        <Row className="g-0">
                            <DungeonTracker setActiveArea={setActiveArea} />
                        </Row>
                        <Row
                            style={{
                                paddingRight: '10%',
                                paddingTop: '2.5%',
                                height: (height * 0.95) / 2,
                                overflow: 'auto',
                            }}
                            className="g-0"
                        >
                            <Col
                                className="g-0"
                            >
                                <ExtraLocationTracker
                                    activeArea={activeArea}
                                    setActiveArea={setActiveArea}
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
                        alignContent: 'center',
                    }}
                >
                    <Col xs="auto">
                        <ImportExport />
                    </Col>
                    <Col xs>
                        <div style={{display: 'flex', flexFlow: 'row nowrap', justifyContent: 'space-between'}}>
                            <Button
                                variant="primary"
                                onClick={() => setShowCustomizationDialog(true)}
                            >
                                Customization
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => setShowEntranceDialog(true)}
                            >
                                Entrances
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => setShowOptionsDialog(true)}
                            >
                                Options
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() =>
                                    dispatch(reset({ settings: undefined }))
                                }
                            >
                                Reset
                            </Button>
                        </div>
                    </Col>
                    <Col xs="auto">
                        <span onClick={() => promptRemote(dispatch, rawRemote)}>{remote}</span>
                    </Col>
                </Row>
            </Container>
            <CustomizationModal
                show={showCustomizationDialog}
                onHide={() => setShowCustomizationDialog(false)}
            />
            <EntranceTracker
                show={showEntranceDialog}
                onHide={() => setShowEntranceDialog(false)}
            />
            <OptionsMenu
                show={showOptionsDialog}
                onHide={() => setShowOptionsDialog(false)}
            />
        </div>
    );
}
