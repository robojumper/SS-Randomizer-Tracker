import { useImperativeHandle, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import CustomizationModal from './customization/CustomizationModal';
import { hasCustomLayoutSelector } from './customization/Selectors';
import { DragAndDropContext } from './dragAndDrop/DragAndDrop';
import EntranceTracker from './entranceTracker/EntranceTracker';
import { ExportButton } from './ImportExport';
import { TrackerLayoutCustom } from './layouts/TrackerLayoutCustom';
import { TrackerLayout } from './layouts/TrackerLayouts';
import { useSyncTrackerStateToLocalStorage } from './LocalStorage';
import LocationContextMenu from './locationTracker/LocationContextMenu';
import LocationGroupContextMenu from './locationTracker/LocationGroupContextMenu';
import { isLogicLoadedSelector } from './logic/Selectors';
import { MakeTooltipsAvailable } from './tooltips/TooltipHooks';
import { settingSelector } from './tracker/Selectors';
import { useTrackerInterfaceReducer } from './tracker/TrackerInterfaceReducer';

export default function TrackerContainer() {
    const logicLoaded = useSelector(isLogicLoadedSelector);

    // If we haven't loaded logic yet, redirect to the main menu,
    // which will take care of loading logic for us.
    if (!logicLoaded) {
        return <Navigate to="/" />;
    }

    return (
        <MakeTooltipsAvailable>
            <DragAndDropContext>
                <Tracker />
            </DragAndDropContext>
            <TrackerStateSaver />
        </MakeTooltipsAvailable>
    );
}

// Split out into separate component to optimize rerenders
function TrackerStateSaver() {
    useSyncTrackerStateToLocalStorage();
    return null;
}

function Tracker() {
    const [handle, setHandle] = useState<ContentsRef | null>(null);
    return (
        <>
            <div
                style={{
                    width: '100vw',
                    height: '100vh',
                    overflow: 'hidden',
                    background: 'var(--scheme-background)',
                }}
            >
                <div
                    style={{
                        height: '95%',
                        position: 'relative',
                        display: 'flex',
                        flexFlow: 'row nowrap',
                    }}
                >
                    <TrackerContents ref={setHandle} />
                </div>
                <div
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: '5%',
                    }}
                >
                    <TrackerFooter
                        onChooseSettingsOverrides={
                            handle?.onChooseSettingsOverrides
                        }
                    />
                </div>
            </div>
        </>
    );
}

interface ContentsRef {
    onChooseSettingsOverrides: () => void;
}

function TrackerContents({ ref }: { ref: React.ForwardedRef<ContentsRef> }) {
    const [trackerInterfaceState, trackerInterfaceDispatch] =
        useTrackerInterfaceReducer();

    const hasCustomLayout = useSelector(hasCustomLayoutSelector);
    // I don't like this but don't want to lift all this state up
    useImperativeHandle(
        ref,
        () => ({
            onChooseSettingsOverrides: () =>
                trackerInterfaceDispatch({ type: 'updateSettings' }),
        }),
        [trackerInterfaceDispatch],
    );

    return (
        <>
            <LocationContextMenu />
            <LocationGroupContextMenu
                interfaceDispatch={trackerInterfaceDispatch}
            />
            {hasCustomLayout ? (
                <TrackerLayoutCustom
                    interfaceDispatch={trackerInterfaceDispatch}
                    interfaceState={trackerInterfaceState}
                />
            ) : (
                <TrackerLayout
                    interfaceDispatch={trackerInterfaceDispatch}
                    interfaceState={trackerInterfaceState}
                />
            )}
        </>
    );
}

function TrackerFooter({
    onChooseSettingsOverrides,
}: {
    onChooseSettingsOverrides: (() => void) | undefined;
}) {
    const [showCustomizationDialog, setShowCustomizationDialog] =
        useState(false);
    const [showEntranceDialog, setShowEntranceDialog] = useState(false);
    const randomSettings = useSelector(settingSelector('random-settings'));

    return (
        <>
            <div
                style={{
                    background: 'lightgrey',
                    width: '100%',
                    height: '100%',
                    alignContent: 'center',
                    display: 'flex',
                    flexFlow: 'row nowrap',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                }}
            >
                <div>
                    <Link to="/">
                        <div className="tracker-button">← Options</div>
                    </Link>
                </div>
                <div>
                    <ExportButton />
                </div>
                {randomSettings && (
                    <div>
                        <button
                            type="button"
                            className="tracker-button"
                            onClick={onChooseSettingsOverrides}
                        >
                            Set Random Settings
                        </button>
                    </div>
                )}
                <div>
                    <button
                        type="button"
                        className="tracker-button"
                        onClick={() => setShowEntranceDialog(true)}
                    >
                        Entrances
                    </button>
                </div>
                <div>
                    <button
                        type="button"
                        className="tracker-button"
                        onClick={() => setShowCustomizationDialog(true)}
                    >
                        Customization
                    </button>
                </div>
            </div>
            <CustomizationModal
                open={showCustomizationDialog}
                onOpenChange={setShowCustomizationDialog}
            />
            <EntranceTracker
                open={showEntranceDialog}
                onOpenChange={setShowEntranceDialog}
            />
        </>
    );
}
