import clsx from 'clsx';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dialog } from '../additionalComponents/Dialog';
import { formatRemote, type RemoteReference } from '../loader/LogicLoader';
import { useSyncSavesToLocalStorage } from '../LocalStorage';
import type { LogicBundle } from '../logic/Slice';
import { encodePermalink, validateSettings } from '../permalink/Settings';
import type { AllTypedOptions } from '../permalink/SettingsTypes';
import { addPreset, type Preset, removePreset } from '../saves/Slice';
import { type RootState, useAppDispatch } from '../store/Store';
import styles from './OptionsPresets.module.css';
import type { OptionsAction } from './OptionsReducer';

export function OptionsPresets({
    className,
    currentLogic,
    currentSettings,
    dispatch,
}: {
    className?: string;
    currentLogic: LogicBundle | undefined;
    currentSettings: AllTypedOptions | undefined;
    dispatch: React.Dispatch<OptionsAction>;
}) {
    const [showModal, setShowModal] = useState(false);
    useSyncSavesToLocalStorage();

    return (
        <>
            <button
                type="button"
                className={clsx('tracker-button', className)}
                onClick={() => setShowModal(true)}
            >
                Presets
            </button>
            <PresetsModal
                currentLogic={currentLogic}
                currentSettings={currentSettings}
                dispatch={dispatch}
                open={showModal}
                onOpenChange={setShowModal}
            />
        </>
    );
}

function permaifyRelease(
    logic: LogicBundle,
): Exclude<RemoteReference, { type: 'latestRelease' }> {
    return logic.remote.type === 'latestRelease'
        ? {
              type: 'releaseVersion',
              versionTag: logic.remoteName,
          }
        : logic.remote;
}

function PresetsModal({
    currentLogic,
    currentSettings,
    dispatch,
    open,
    onOpenChange,
}: {
    currentLogic: LogicBundle | undefined;
    currentSettings: AllTypedOptions | undefined;
    dispatch: React.Dispatch<OptionsAction>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const presets = useSelector((state: RootState) => state.saves.presets);
    const remotePresets: Preset[] | undefined = useMemo(
        () =>
            currentLogic &&
            Object.entries(currentLogic?.presets).map(([name, data]) => {
                const validatedSettings = validateSettings(
                    currentLogic.options,
                    data,
                );
                return {
                    id: `remote-${name}`,
                    name,
                    remote: permaifyRelease(currentLogic),
                    settings: validatedSettings,
                    visualPermalink: encodePermalink(
                        currentLogic.options,
                        validatedSettings,
                    ),
                } satisfies Preset;
            }),
        [currentLogic],
    );

    const onHide = () => onOpenChange(false);

    return (
        <Dialog open={open} onOpenChange={onOpenChange} title="Presets">
            <div className={styles.presetList}>
                {remotePresets?.map((p) => (
                    <PresetRow
                        preset={p}
                        isRemotePreset
                        dispatch={dispatch}
                        key={p.id}
                        onHide={onHide}
                    />
                ))}
                {presets.map((p) => (
                    <PresetRow
                        preset={p}
                        dispatch={dispatch}
                        key={p.id}
                        onHide={onHide}
                    />
                ))}
                {currentLogic && currentSettings && (
                    <AddPresetRow
                        currentLogic={currentLogic}
                        currentSettings={currentSettings}
                    />
                )}
            </div>
        </Dialog>
    );
}

function PresetRow({
    preset,
    dispatch,
    onHide,
    isRemotePreset,
}: {
    preset: Preset;
    dispatch: React.Dispatch<OptionsAction>;
    onHide: () => void;
    isRemotePreset?: boolean;
}) {
    const [confirmMode, setConfirmMode] = useState(false);

    const appDispatch = useAppDispatch();
    return (
        <div
            role="button"
            onClick={() => {
                dispatch({
                    type: 'applyPreset',
                    remote: preset.remote,
                    settings: preset.settings,
                });
                onHide();
            }}
            className={clsx(styles.presetRow, styles.button)}
        >
            <div className={styles.header}>
                {preset.name}
                {!isRemotePreset && (
                    <div>
                        <button
                            type="button"
                            className={clsx('tracker-button', {
                                ['tracker-button-danger']: confirmMode,
                            })}
                            onMouseLeave={() => {
                                setConfirmMode(false);
                            }}
                            onClick={(e) => {
                                if (confirmMode) {
                                    appDispatch(removePreset(preset.id));
                                } else {
                                    setConfirmMode(true);
                                }
                                e.stopPropagation();
                            }}
                        >
                            {confirmMode ? 'Confirm' : 'Delete'}
                        </button>
                    </div>
                )}
            </div>
            <div className={styles.body}>
                {formatRemote(preset.remote)}
                <span className={styles.presetLogicStringSep} />
                <span className={styles.permalink}>
                    {preset.visualPermalink}
                </span>
            </div>
        </div>
    );
}

function AddPresetRow({
    currentLogic,
    currentSettings,
}: {
    currentLogic: LogicBundle;
    currentSettings: AllTypedOptions;
}) {
    const dispatch = useDispatch();
    const [input, setInput] = useState('');
    return (
        <div className={clsx(styles.presetRow, styles.addRow)}>
            <input
                className="tracker-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter Preset Name"
            />
            <button
                type="button"
                className="tracker-button"
                disabled={input === ''}
                onClick={() => {
                    dispatch(
                        addPreset({
                            name: input,
                            remote: permaifyRelease(currentLogic),
                            settings: currentSettings,
                            visualPermalink: encodePermalink(
                                currentLogic.options,
                                currentSettings,
                            ),
                        }),
                    );
                    setInput('');
                }}
            >
                Add Preset
            </button>
        </div>
    );
}
