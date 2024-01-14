import { useDispatch, useSelector } from 'react-redux';
import { LogicOptions } from './logic/ThingsThatWouldBeNiceToHaveInTheDump';
import './options.css';
import { optionsSelector, rawOptionsSelector } from './logic/selectors';
import { OptionValue, TypedOptions } from './permalink/SettingsTypes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { decodePermalink, encodePermalink, validateSettings } from './permalink/Settings';
import { Option } from './permalink/SettingsTypes';
import { Button, Col, Container, FormCheck, FormControl, FormLabel, Row, Tab, Tabs } from 'react-bootstrap';
import { RemoteReference, defaultUpstream, formatRemote, loadRemoteLogic, parseRemote } from './loader/LogicLoader';
import { allSettingsSelector } from './tracker/selectors';
import { acceptSettings, reset } from './tracker/slice';
import Acknowledgement from './Acknowledgment';
import { Link, useNavigate } from 'react-router-dom';
import { RootState, ThunkResult, useAppDispatch } from './store/store';
import _, { range } from 'lodash';
import { loadLogic } from './logic/slice';
import Tippy from '@tippyjs/react';
import Select, { MultiValue, ActionMeta } from 'react-select';
// import { selectStyles } from './customization/ComponentStyles';

const optionCategorization: Record<string, LogicOptions[]> = {
    'Shuffles': [
        'rupeesanity',
        'shopsanity',
        'beedle-shopsanity',
        'luv-shopsanity',
        'rupin-shopsanity',
        'gondo-upgrades',
        'tadtonesanity',
        'treasuresanity-in-silent-realms',
        'trial-treasure-amount',
        'small-key-mode',
        'boss-key-mode',
        'empty-unrequired-dungeons',
    ],
    'Starting Items': [
        'starting-sword',
        'upgraded-skyward-strike',
        'starting-tablet-count',
        'starting-bottles',
        'starting-crystal-packs',
        'starting-tadtones',
        'starting-items',
    ],
    'Entrances': [
        'random-start-entrance',
        'random-start-statues',
        'randomize-entrances',
        'randomize-dungeon-entrances',
        'randomize-trials',
    ],
    'Convenience': [
        'open-lake-floria',
        'open-et',
        'open-lmf',
        'open-thunderhead',
        'fs-lava-flow',
    ],
    'Victory': [
        'got-start',
        'got-sword-requirement',
        'got-dungeon-requirement',
        'required-dungeon-count',
        'triforce-required',
        'triforce-shuffle',
    ],
    'Miscellaneous': [
        'bit-patches',
        'damage-multiplier',
        'enabled-tricks-bitless',
        'enabled-tricks-glitched',
        'excluded-locations',
    ],
};

function getStoredRemote() {
    const storedRemote = localStorage.getItem('ssrTrackerRemoteLogic');
    return storedRemote !== null ? JSON.parse(storedRemote) as RemoteReference : defaultUpstream;
}

/**
 * The default landing page for the tracker. Allows choosing logic source, permalink, and settings,
 * and allows moving to the main tracker.
 * 
 * This component does not expect logic to be loaded, and will help loading logic.
 * As a result, it does not access any selectors that assume logic has already loaded unless we know it's loaded.
 */
export default function Options() {
    const rawOptions = useSelector(rawOptionsSelector);

    return (
        <Container fluid>
            <div className="optionsPage">
                <div style={{ display: 'flex', flexFlow: 'row nowrap' }}>
                    <LogicChooser />
                    <PermalinkChooser />
                </div>
                <LaunchButtons />
                {rawOptions && (
                    <OptionsList />
                )}
            </div>
            <Acknowledgement />
        </Container>
    );
}

function resetTracker(): ThunkResult {
    return (dispatch, getState) => {
        if (rawOptionsSelector(getState())) {
            dispatch(reset({ settings: allSettingsSelector(getState()) }));
        }
    };
}

function LaunchButtons() {
    const dispatch = useAppDispatch();
    const loaded = Boolean(useSelector(rawOptionsSelector));
    const modified = Boolean(useSelector((state: RootState) => state.tracker.hasBeenModified));

    const canStart = loaded;
    const canResume = loaded && modified;

    const navigate = useNavigate();

    const reset = useCallback(() => {
        if (
            canStart &&
            (!canResume ||
                window.confirm('Reset your tracker and start a new run?'))
        ) {
            dispatch(resetTracker());
            navigate('/tracker');
        }
    }, [canResume, canStart, dispatch, navigate]);

    return (
        <div className="launchButtons">
            <Link
                className={`btn btn-primary ${
                    canResume ? '' : 'disabledLink disabled'
                }`}
                to="/tracker"
            >
                Continue Tracker
            </Link>
            <Button
                disabled={!canStart}
                onClick={reset}
            >
                Launch New Tracker
            </Button>
        </div>
    );
}

type LoadingState =
    | { type: 'loading' }
    | {
          type: 'badFormat';
      }
    | {
          type: 'downloadError';
          error: string;
      };

/** A component to choose your logic release. */
function LogicChooser() {
    const dispatch = useDispatch();
    const [inputValue, setInputValue] = useState(() => formatRemote(getStoredRemote()));
    const [loadingState, setLoadingState] = useState<LoadingState | undefined>(undefined);

    const loadedRemote = useSelector((state: RootState) => state.logic.remote);


    useEffect(() => {
        let canceled = false;
        const load = async () => {
            setLoadingState({ type: 'loading' });
            const parsed = parseRemote(inputValue);
            if (!parsed) {
                setLoadingState({ type: 'badFormat' });
                return;
            }

            if (_.isEqual(parsed, loadedRemote)) {
                setLoadingState(undefined);
                return;
            }
            try {
                const [logic, options] = await loadRemoteLogic(parsed);
                if (!canceled) {
                    dispatch(loadLogic({ logic, options, remote: parsed }))
                    setLoadingState(undefined);
                }
            } catch (e) {
                if (!canceled) {
                    setLoadingState({
                        type: 'downloadError',
                        error: e
                            ? typeof e === 'object' && 'message' in e
                                ? (e.message as string)
                                : JSON.stringify(e)
                            : 'Unknown error',
                    });
                }
            }

        };

        load();

        return () => {
            canceled = true;
        }
    }, [dispatch, inputValue, loadedRemote]);
    
    const badFormat = loadingState?.type === 'badFormat';

    return (
        <div className="optionsCategory logicChooser">
            <legend>Randomizer Version</legend>
            <div className="logicInputWithStatus">
                <input
                    className={badFormat ? 'optionsBadRemote' : ''}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
                {loadingState?.type === 'loading'
                    ? '⏳'
                    : loadingState
                        ? '❌'
                        : '✅'}
            </div>
        </div>
    );
}

/** A component to choose your logic release. */
function PermalinkChooser() {
    const dispatch = useDispatch();
    const options = useSelector(optionsSelector);
    const settings = useSelector((state: RootState) => state.tracker.settings);
    const permalink = useMemo(
        () => options && settings && encodePermalink(options, validateSettings(options, settings)),
        [options, settings],
    );

    const onChangePermalink = useCallback(
        (link: string) => {
            try {
                if (options) {
                    const settings = decodePermalink(options, link);
                    dispatch(acceptSettings({ settings }));
                }
            } catch (e) {
                console.error('invalid permalink', link, e);
            }
        },
        [dispatch, options],
    );

    return (
        <div className="optionsCategory permalinkChooser">
            <legend>Settings String</legend>
            <input className="permalinkInput" disabled={!permalink} placeholder="Select a Randomizer version first" value={permalink ?? ""} onChange={(e) => onChangePermalink(e.target.value)} />
        </div>
    );
}

/** A list of all options categories. */
function OptionsList() {
    const optionDefs = useSelector(optionsSelector);
    const settings = useSelector(allSettingsSelector);
    const dispatch = useDispatch();

    const changeSetting = useCallback(
        <K extends LogicOptions>(key: K, value: TypedOptions[K]) => {
            dispatch(acceptSettings({ settings: {...settings, [key]: value }}));
        },
        [dispatch, settings],
    );

    return (
        <div className="optionsCategory">
            <Tabs defaultActiveKey="Shuffles">
                {Object.entries(optionCategorization).map(
                    ([title, categoryOptions]) => {
                        return (
                            <Tab eventKey={title} key={title} title={title}>
                                <div className="optionsTab">
                                    {categoryOptions.map((command) => {
                                        const entry = optionDefs.find(
                                            (o) => o.command === command,
                                        );
                                        if (!entry) {
                                            return null;
                                        }
                                        return (
                                            <Row key={command}>
                                                <Setting
                                                    def={entry}
                                                    value={settings[command]!}
                                                    setValue={(val) =>
                                                        changeSetting(
                                                            command,
                                                            val as TypedOptions[typeof command],
                                                        )
                                                    }
                                                />
                                            </Row>
                                        );
                                    })}
                                </div>
                            </Tab>
                        );
                    },
                )}
            </Tabs>
        </div>
    );
}

function Setting({
    def,
    value,
    setValue,
}: {
    def: Option;
    value: OptionValue;
    setValue: (val: OptionValue) => void;
}) {
    switch (def.type) {
        case 'boolean':
            return (
                <>
                    <Col xs={5}>
                        <Tippy content={def.help}>
                            <FormLabel htmlFor={def.name}>{def.name}</FormLabel>
                        </Tippy>
                    </Col>
                    <Col xs={6}>
                        <FormCheck
                            type="switch"
                            checked={value as boolean}
                            onChange={(e) => setValue(e.target.checked)}
                        />
                    </Col>
                </>
            );
        case 'int':
            return (
                <>
                    <Col xs={5}>
                        <Tippy content={def.help}>
                            <FormLabel htmlFor={def.name}>{def.name}</FormLabel>
                        </Tippy>
                    </Col>
                    <Col xs={6}>
                        <FormControl
                            as="select"
                            id={def.name}
                            onChange={(e) =>
                                setValue(parseInt(e.target.value, 10))
                            }
                            value={(value as number).toString()}
                        >
                            {range(def.min, def.max + 1).map((val) => (
                                <option key={val}>{val}</option>
                            ))}
                        </FormControl>
                    </Col>
                </>
            );
        case 'singlechoice':
            return (
                <>
                    <Col xs={5}>
                        <Tippy content={def.help}>
                            <FormLabel htmlFor={def.name}>{def.name}</FormLabel>
                        </Tippy>
                    </Col>
                    <Col xs={6}>
                        <FormControl
                            as="select"
                            id={def.name}
                            onChange={(e) => setValue(e.target.value)}
                            value={value as string}
                        >
                            {def.choices.map((val, idx) => (
                                <option key={`val-${idx}`}>{val}</option>
                            ))}
                        </FormControl>
                    </Col>
                </>
            );
        case 'multichoice': {
            type Option = {
                value: string;
                label: string;
            };
            const onChange = (
                selectedOption: MultiValue<Option>,
                meta: ActionMeta<Option>,
            ) => {
                if (
                    meta.action === 'select-option' ||
                    meta.action === 'remove-value'
                ) {
                    setValue(selectedOption.map((o) => o.value));
                } else if (meta.action === 'clear') {
                    setValue([]);
                }
            };
            return (
                <>
                    <Col xs={5}>
                        <Tippy content={def.help}>
                            <FormLabel htmlFor={def.name}>{def.name}</FormLabel>
                        </Tippy>
                    </Col>
                    <Col xs={6}>
                        <Select
                            // styles={selectStyles<true, { label: string, value: string }>()}
                            isMulti
                            value={(value as string[]).map((val) => ({
                                value: val,
                                label: val,
                            }))}
                            onChange={onChange}
                            options={def.choices.map((val) => ({
                                value: val,
                                label: val,
                            }))}
                            name={def.name}
                        />
                    </Col>
                </>
            );
        }
    }
}