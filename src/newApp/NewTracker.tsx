import {
    CSSProperties,
    useEffect,
    useMemo,
    useReducer,
    useSyncExternalStore,
} from 'react';
import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import _ from 'lodash';
import ColorScheme from '../customization/ColorScheme';
import { Layout } from '../customization/CustomizationModal';
import { Logic } from './NewLogic';
import ItemTracker from '../itemTracker/ItemTracker';
import GridTracker from '../itemTracker/GridTracker';
import { TrackerState, trackerReducer } from './TrackerReducer';
import { WithContext } from './Context';
import { NewLocationTracker } from './NewLocationTracker';
import { interpretLogic } from './LogicInterpretation';
import { mapState } from './State';

function initTrackerState(): TrackerState {
    // const path = new URLSearchParams(window.location.search);
    // const source = path.get('source')!;
    const schemeJson = localStorage.getItem('ssrTrackerColorScheme');
    const colorScheme = schemeJson
        ? (JSON.parse(schemeJson) as ColorScheme)
        : new ColorScheme();
    const layout =
        (localStorage.getItem('ssrTrackerLayout') as Layout | null) ??
        'inventory';
    return {
        state: {
            acquiredItems: {},
            mappedExits: {},
            startingEntrance: '',
            checkedChecks: [],
        },
        width: window.innerWidth,
        height: window.innerHeight,
        showCustomizationDialog: false,
        colorScheme,
        layout,
        showEntranceDialog: false,
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

let debuggingState: TrackerState | undefined;
let debuggingLogic: Logic | undefined;

function debugItem(item: string) {
    if (debuggingLogic === undefined || debuggingState === undefined) {
        return undefined;
    }
    const results = interpretLogic(debuggingLogic, debuggingState.state);
    // console.log(Object.keys(debuggingLogic.items));
    const bit = debuggingLogic.items[item][1];
    console.log(`${item}: ${String(results.test(bit))}`);
}

function installDebuggingHooks() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (window as any).debugItem = debugItem;
}

export default function NewTrackerContainer({ logic }: { logic: Logic }) {
    const [trackerState, dispatch] = useReducer(
        trackerReducer,
        undefined,
        initTrackerState,
    );

    debuggingLogic = logic;
    debuggingState = trackerState;
    useEffect(installDebuggingHooks, []);

    return (
        <WithContext state={trackerState} dispatch={dispatch}>
            <NewTracker colorScheme={trackerState.colorScheme} layout={trackerState.layout} logic={logic} />
        </WithContext>
    );
}

function NewTracker({ logic, layout, colorScheme }: { logic: Logic, layout: Layout, colorScheme: ColorScheme }) {
    const { height, width } = useWindowDimensions();

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
        <div style={{ height: height * 0.95, overflow: 'hidden', background: colorScheme.background }}>
            <Container fluid>
                <Row>
                    <Col>

                        {itemTracker}

                    </Col>
                    <Col>
                        <NewLocationTracker logic={logic} />
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
