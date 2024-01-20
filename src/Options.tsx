import { useDispatch, useSelector } from 'react-redux';
import { LogicOptions } from './logic/ThingsThatWouldBeNiceToHaveInTheDump';
import './options.css';
import { optionsSelector } from './logic/selectors';
import {
    OptionDefs,
    OptionValue,
    TypedOptions,
} from './permalink/SettingsTypes';
import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    decodePermalink,
    encodePermalink,
    randomSettings,
    validateSettings,
} from './permalink/Settings';
import { Option } from './permalink/SettingsTypes';
import {
    Button,
    Col,
    Container,
    FormCheck,
    FormControl,
    FormLabel,
    Row,
    Tab,
    Tabs,
} from 'react-bootstrap';
import {
    RemoteReference,
    formatRemote,
    loadRemoteLogic,
    parseRemote,
} from './loader/LogicLoader';
import { allSettingsSelector } from './tracker/selectors';
import { acceptSettings, reset } from './tracker/slice';
import Acknowledgement from './Acknowledgment';
import { Link, useNavigate } from 'react-router-dom';
import { RootState, ThunkResult, useAppDispatch } from './store/store';
import { range } from 'lodash';
import { loadLogic } from './logic/slice';
import Tippy from '@tippyjs/react';
import Select, { MultiValue, ActionMeta, SingleValue } from 'react-select';
import { selectStyles } from './customization/ComponentStyles';
import { withCancel } from './utils/CancelToken';
import { RawLogic } from './logic/UpstreamTypes';
import _ from 'lodash';
import ImageLink from './additionalComponents/ImageLink';

const optionCategorization: Record<string, LogicOptions[]> = {
    Shuffles: [
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
    Entrances: [
        'random-start-entrance',
        'random-start-statues',
        'randomize-entrances',
        'randomize-dungeon-entrances',
        'randomize-trials',
    ],
    Convenience: [
        'open-lake-floria',
        'open-et',
        'open-lmf',
        'open-thunderhead',
        'fs-lava-flow',
    ],
    Victory: [
        'got-start',
        'got-sword-requirement',
        'got-dungeon-requirement',
        'required-dungeon-count',
        'triforce-required',
        'triforce-shuffle',
    ],
    Miscellaneous: [
        'bit-patches',
        'damage-multiplier',
        'enabled-tricks-bitless',
        'enabled-tricks-glitched',
        'excluded-locations',
    ],
};

// logic-v2.1.1 is a temporary branch that's permalink-compatible with the v2.1.1 release,
// but uses the logic dump from main.
// That branch will be removed once we get a stable release with the logic dump.
// Older releases will be unsupported then.

const defaultUpstream: RemoteReference = {
    type: 'forkBranch',
    author: 'robojumper',
    branch: 'logic-v2.1.1',
};

const logicMigrations: Record<string, string> = {
    'robojumper/logic-dump': 'robojumper/logic-v2.1.1',
    'robojumper/statuesanity': 'YourAverageLink/random-pillar-statue',
};

const wellKnownRemotes = [
    'Latest',
    'ssrando/main',
    'robojumper/logic-v2.1.1',
    'YourAverageLink/random-pillar-statue',
];

function getStoredRemote() {
    const storedRemote = localStorage.getItem('ssrTrackerRemoteLogic');
    const theRemote =
        storedRemote !== null
            ? (JSON.parse(storedRemote) as RemoteReference)
            : defaultUpstream;
    const migration = logicMigrations[formatRemote(theRemote)];
    if (migration) {
        return parseRemote(migration)!;
    } else {
        return theRemote;
    }
}

/**
 * The default landing page for the tracker. Allows choosing logic source, permalink, and settings,
 * and allows moving to the main tracker.
 *
 * This component does not expect logic to be loaded, and will help loading logic.
 * As a result, it does not access any selectors that assume logic has already loaded unless we know it's loaded.
 */
export default function Options() {
    const options = useSelector(optionsSelector);

    return (
        <Container fluid>
            <div className="optionsPage">
                <div style={{ display: 'flex', flexFlow: 'row nowrap' }}>
                    <LogicChooser />
                    <PermalinkChooser />
                </div>
                <LaunchButtons />
                {options && <OptionsList />}
            </div>
            <Acknowledgement />
        </Container>
    );
}

function resetTracker(): ThunkResult {
    return (dispatch, getState) => {
        if (optionsSelector(getState())) {
            dispatch(reset({ settings: allSettingsSelector(getState()) }));
        }
    };
}

function LaunchButtons() {
    const dispatch = useAppDispatch();
    const options = useSelector(optionsSelector);
    const loaded = Boolean(options);
    const modified = Boolean(
        useSelector((state: RootState) => state.tracker.hasBeenModified),
    );

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

    const doRandomizeOptions = useCallback(() => {
        if (options && window.confirm('Randomize all settings?')) {
            dispatch(acceptSettings({ settings: randomSettings(options) }));
        }
    }, [dispatch, options]);

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
            <Button disabled={!canStart} onClick={reset}>
                Launch New Tracker
            </Button>
            <Button
                className="randomizeButton"
                disabled={!loaded}
                onClick={doRandomizeOptions}
            >
                Randomize Settings
            </Button>
        </div>
    );
}

type LoadingState =
    | { type: 'loading' }
    | {
          type: 'downloadError';
          error: string;
      };

async function loadRemote(
    remote: RemoteReference,
): Promise<[RawLogic, OptionDefs, string] | string> {
    try {
        return await loadRemoteLogic(remote);
    } catch (e) {
        return e
            ? typeof e === 'object' && 'message' in e
                ? (e.message as string)
                : JSON.stringify(e)
            : 'Unknown error';
    }
}

/** A component to choose your logic release. */
function LogicChooser() {
    const dispatch = useDispatch();
    const [desiredRemote, setDesiredRemote] = useState(() => getStoredRemote());
    const [loadingState, setLoadingState] = useState<LoadingState | undefined>(
        undefined,
    );
    const inputRef = useRef<PlaintextRef>(null);

    const loadedRemote = useSelector(
        (state: RootState) => state.logic.remoteName,
    );

    const wellKnownSelectOptions = useMemo(() => {
        return wellKnownRemotes.map((remote) => ({
            value: parseRemote(remote)!,
            label: remote,
        }));
    }, []);

    const activeOption = wellKnownSelectOptions.find((option) =>
        _.isEqual(option.value, desiredRemote),
    );

    const onRemoteChange = (
        selectedOption: SingleValue<{ label: string; value: RemoteReference }>,
        meta: ActionMeta<{ label: string; value: RemoteReference }>,
    ) => {
        if (meta.action === 'select-option' && selectedOption) {
            setDesiredRemote(selectedOption.value);
        }
    };

    useEffect(() => {
        const [cancelToken, cancel] = withCancel();
        (async () => {
            if (!cancelToken.canceled) {
                setLoadingState({ type: 'loading' });
                const result = await loadRemote(desiredRemote);
                if (!cancelToken.canceled) {
                    if (typeof result === 'string') {
                        setLoadingState({
                            type: 'downloadError',
                            error: result,
                        });
                    } else {
                        const [logic, options, remoteName] = result;
                        setLoadingState(undefined);
                        dispatch(
                            loadLogic({
                                logic,
                                options,
                                remote: desiredRemote,
                                remoteName,
                            }),
                        );
                    }
                }
            }
        })();

        return cancel;
    }, [desiredRemote, dispatch, loadedRemote]);

    return (
        <div className="optionsCategory logicChooser">
            <legend>
                Randomizer Version
                {loadedRemote && `: ${loadedRemote}`}
            </legend>
            <Tabs
                defaultActiveKey="wellKnown"
                onSelect={(e) => {
                    if (e === 'raw') {
                        inputRef.current?.setInput(formatRemote(desiredRemote));
                    }
                }}
            >
                <Tab key="wellKnown" eventKey="wellKnown" title="Releases">
                    <Select
                        styles={selectStyles<
                            false,
                            { label: string; value: RemoteReference }
                        >()}
                        value={activeOption}
                        onChange={onRemoteChange}
                        options={wellKnownSelectOptions}
                        name="Select remote"
                    />
                </Tab>
                <Tab key="raw" eventKey="raw" title="Beta Feature">
                    <span>
                        Find cool beta features on the Discord{' '}
                        <ImageLink
                            href="https://discord.gg/evpNKkaaw6"
                            src="https://discordapp.com/api/guilds/767090759773323264/embed.png?style=shield"
                            alt="Discord Embed"
                        />
                    </span>
                    <PlaintextLogicInput
                        ref={inputRef}
                        desiredRemote={desiredRemote}
                        setDesiredRemote={setDesiredRemote}
                    />
                </Tab>
            </Tabs>
            <LoadingStateIndicator loadingState={loadingState} />
        </div>
    );
}

export interface PlaintextRef {
    setInput: (text: string) => void;
}

const PlaintextLogicInput = forwardRef(function PlaintextLogicInput(
    {
        desiredRemote,
        setDesiredRemote,
    }: {
        desiredRemote: RemoteReference;
        setDesiredRemote: (ref: RemoteReference) => void;
    },
    ref: React.ForwardedRef<PlaintextRef>,
) {
    const [input, setInput] = useState(() => formatRemote(desiredRemote));
    const parsed = useMemo(() => parseRemote(input), [input]);
    const badFormat = !parsed;
    useEffect(() => {
        if (parsed) {
            setDesiredRemote(parsed);
        }
    }, [parsed, setDesiredRemote]);

    useImperativeHandle(ref, () => ({ setInput }), []);

    return (
        <div>
            <input
                type="text"
                className={badFormat ? 'optionsBadRemote' : ''}
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />
        </div>
    );
});

function LoadingStateIndicator({
    loadingState,
}: {
    loadingState: LoadingState | undefined;
}) {
    return (
        <div>
            {loadingState?.type === 'loading' ? (
                '⏳'
            ) : loadingState ? (
                <Tippy content={<>{loadingState.error}</>}>
                    <span>❌</span>
                </Tippy>
            ) : (
                '✅'
            )}
        </div>
    );
}

/** A component to choose your logic release. */
function PermalinkChooser() {
    const dispatch = useDispatch();
    const options = useSelector(optionsSelector);
    const settings = useSelector((state: RootState) => state.tracker.settings);
    const permalink = useMemo(
        () =>
            options &&
            encodePermalink(options, validateSettings(options, settings)),
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
            <input
                type="text"
                className="permalinkInput"
                disabled={!permalink}
                placeholder="Select a Randomizer version first"
                value={permalink ?? ''}
                onChange={(e) => onChangePermalink(e.target.value)}
            />
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
            dispatch(
                acceptSettings({ settings: { ...settings, [key]: value } }),
            );
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
            const numPaddingDigits = 4;
            const onChange = (
                selectedOption: MultiValue<Option>,
                meta: ActionMeta<Option>,
            ) => {
                if (
                    meta.action === 'select-option' ||
                    meta.action === 'remove-value'
                ) {
                    setValue(
                        selectedOption.map((o) =>
                            o.value.slice(0, -numPaddingDigits),
                        ),
                    );
                } else if (meta.action === 'clear') {
                    setValue([]);
                }
            };
            // Hack: Ensure unique keys...........
            const options = def.choices.map((val, idx) => ({
                value: val + idx.toString().padStart(numPaddingDigits, '0'),
                label: val,
            }));
            return (
                <>
                    <Col xs={5}>
                        <Tippy content={def.help}>
                            <FormLabel htmlFor={def.name}>{def.name}</FormLabel>
                        </Tippy>
                    </Col>
                    <Col xs={6}>
                        <Select
                            styles={selectStyles<
                                true,
                                { label: string; value: string }
                            >()}
                            isMulti
                            value={(value as string[]).map((val, idx) => ({
                                value:
                                    val +
                                    idx
                                        .toString()
                                        .padStart(numPaddingDigits, '0'),
                                label: val,
                            }))}
                            onChange={onChange}
                            options={options}
                            name={def.name}
                        />
                    </Col>
                </>
            );
        }
    }
}
