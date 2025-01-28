import { range } from 'es-toolkit';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Select } from '../../additionalComponents/Select';
import { optionsSelector } from '../../logic/Selectors';
import {
    hiddenRandomSettings,
    nonRandomizedSettings,
} from '../../logic/ThingsThatWouldBeNiceToHaveInTheDump';
import { isTrackerUserRelevantSetting } from '../../permalink/Settings';
import type { Option, OptionValue } from '../../permalink/SettingsTypes';
import { overriddenSettingsOnlySelector } from '../../tracker/Selectors';
import { acceptSettingsOverrides } from '../../tracker/Slice';
import type { InterfaceAction } from '../../tracker/TrackerInterfaceReducer';
import styles from './OptionsOverrideChooser.module.css';

export default function OptionsOverrideChooser({
    interfaceDispatch,
}: {
    interfaceDispatch: React.Dispatch<InterfaceAction>;
}) {
    const dispatch = useDispatch();
    const overriddenSettingsOnly = useSelector(overriddenSettingsOnlySelector);
    const [state, setState] = useState(overriddenSettingsOnly);

    const options = useSelector(optionsSelector);
    const potentiallyRandomizedSettings = useMemo(
        () =>
            options.filter(
                (o) =>
                    o.permalink !== false &&
                    !nonRandomizedSettings.includes(o.command) &&
                    !hiddenRandomSettings.includes(o.command) &&
                    isTrackerUserRelevantSetting(o.command),
            ),
        [options],
    );

    return (
        <div className={styles.optionsChooser}>
            <span className={styles.query}>What are the random settings?</span>
            <div className={styles.buttons}>
                <button
                    type="button"
                    className="tracker-button"
                    onClick={() =>
                        interfaceDispatch({ type: 'cancelUpdateSettings' })
                    }
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="tracker-button"
                    onClick={() => {
                        dispatch(acceptSettingsOverrides({ settings: state }));
                        interfaceDispatch({ type: 'cancelUpdateSettings' });
                    }}
                >
                    Update Settings
                </button>
            </div>
            <div className={styles.options}>
                {potentiallyRandomizedSettings.map((option) => (
                    <React.Fragment key={option.command}>
                        <div>{option.name}</div>
                        <Setting
                            def={option}
                            value={state[option.command]}
                            setValue={(val) => {
                                setState((oldState) => ({
                                    ...oldState,
                                    [option.command]: val,
                                }));
                            }}
                        />
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

function Setting({
    def,
    value,
    setValue,
}: {
    def: Option;
    value: OptionValue | undefined;
    setValue: (val: OptionValue | undefined) => void;
}) {
    switch (def.type) {
        case 'boolean': {
            const selectVal = (v: boolean | undefined) => ({
                value: v?.toString() ?? 'tracker-random',
                payload: v,
                label: v === true ? 'Yes' : v === false ? 'No' : 'Random',
            });
            const myValue: boolean | undefined = value as boolean | undefined;
            return (
                <div>
                    <Select<boolean | undefined>
                        selectedValue={selectVal(myValue)}
                        onValueChange={(e) => setValue(e)}
                        options={[undefined, true, false].map(selectVal)}
                        label={def.name}
                        menuPlacement="auto"
                    />
                </div>
            );
        }
        case 'int': {
            const selectVal = (v: number | undefined) => ({
                value: v?.toString() ?? 'tracker-random',
                payload: v,
                label: v === undefined ? 'Random' : v.toString(),
            });
            const myValue: number | undefined = value as number | undefined;
            return (
                <div>
                    <Select<number | undefined>
                        selectedValue={selectVal(myValue)}
                        onValueChange={(e) => setValue(e)}
                        options={[
                            undefined,
                            ...range(def.min, def.max + 1),
                        ].map(selectVal)}
                        label={def.name}
                        menuPlacement="auto"
                    />
                </div>
            );
        }
        case 'singlechoice': {
            const selectVal = (v: string | undefined) => ({
                value: v?.toString() ?? 'tracker-random',
                payload: v,
                label: v === undefined ? 'Random' : v,
            });
            const myValue: string | undefined = value as string | undefined;
            return (
                <div>
                    <Select<string | undefined>
                        selectedValue={selectVal(myValue)}
                        onValueChange={(e) => setValue(e)}
                        options={[undefined, ...def.choices].map(selectVal)}
                        label={def.name}
                        menuPlacement="auto"
                    />
                </div>
            );
        }
        case 'multichoice': {
            throw new Error(
                `multichoice setting ${def.command} cannot be randomized!`,
            );
        }
    }
}
