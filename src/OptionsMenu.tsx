import { useCallback, useMemo, useRef, useState } from 'react';
import {
    Modal,
    Button,
    Row,
    Col,
    FormCheck,
    FormLabel,
    FormControl,
} from 'react-bootstrap';
import Select, { ActionMeta, MultiValue } from 'react-select';
import 'tippy.js/dist/tippy.css';
import { AllTypedOptions, Option, OptionValue } from './permalink/SettingsTypes';
import { decodePermalink, encodePermalink, validateSettings } from './permalink/Settings';
import Tippy from '@tippyjs/react';
import { useDispatch, useSelector } from 'react-redux';
import { allSettingsSelector } from './tracker/selectors';
import { acceptSettings, reset } from './tracker/slice';
import { optionsSelector } from './logic/selectors';
import { selectStyles } from './customization/ComponentStyles';
import { inLogicOptions } from './logic/ThingsThatWouldBeNiceToHaveInTheDump';

function OptionsMenu({
    show,
    onHide,
}: {
    show: boolean,
    onHide: () => void;
}) {
    const options = useSelector(optionsSelector);
    const storedSettings = useSelector(allSettingsSelector);
    const dispatch = useDispatch();
    const inputRef = useRef<HTMLInputElement>(null);

    const selectAll = useCallback(() => inputRef.current?.setSelectionRange(0, inputRef.current.value.length), []);

    const [tempSettings, setTempSettings] = useState<Partial<AllTypedOptions>>({});

    const mergedSettings: AllTypedOptions = useMemo(
        () => validateSettings(options, { ...storedSettings, ...tempSettings }),
        [options, storedSettings, tempSettings],
    );

    const permalink = useMemo(
        () => encodePermalink(options, mergedSettings),
        [options, mergedSettings],
    );

    const onChangePermalink = useCallback(
        (link: string) => {
            try {
                const settings = decodePermalink(options, link);
                setTempSettings(settings);
            } catch (e) {
                console.error('invalid permalink', link, e);
            }
        },
        [options],
    );

    const onDismiss = useCallback(() => {
        setTempSettings({});
        onHide();
    }, [onHide]);

    const onAccept = useCallback(() => {
        dispatch(acceptSettings({ settings: mergedSettings }));
        onDismiss();
    }, [dispatch, mergedSettings, onDismiss]);

    const onAcceptWithReset = useCallback(() => {
        dispatch(reset({ settings: mergedSettings }));
        onDismiss();
    }, [dispatch, mergedSettings, onDismiss]);

    return (
        <Modal onHide={onDismiss} show={show} size="lg" style={{ width: '90%' }}>
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    Options
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="show-grid">
                <Row style={{ paddingBottom: '3%' }}>
                    <Col xs={5}>Permalink</Col>
                    <Col xs={6}>
                        <input
                            ref={inputRef}
                            onFocus={selectAll}
                            type="text"
                            placeholder="Permalink"
                            onChange={(e) => onChangePermalink(e.target.value)}
                            value={permalink}
                            style={{ width: '100%' }}
                        />
                    </Col>
                </Row>

                <Row style={{ height: '600px', overflowY: 'auto' }}>
                    {inLogicOptions.map((option) => {
                        const def = options.find(
                            (def) => def.command === option,
                        );
                        if (!def) {
                            return null;
                        }
                        return (
                            <Row key={def.name}>
                                <Setting
                                    def={def}
                                    value={
                                        mergedSettings[def.command] as OptionValue
                                    }
                                    setValue={(value) =>
                                        setTempSettings((existing) => ({
                                            ...existing,
                                            [def.command]: value,
                                        }))
                                    }
                                />
                            </Row>
                        );
                    })}
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={onAccept}>Accept Settings</Button>
                <Button onClick={onAcceptWithReset}>Accept and Reset Tracker</Button>
                <Button onClick={onDismiss}>Cancel</Button>
            </Modal.Footer>
        </Modal>
    );
}

function range(min: number, max: number): number[] {
    return Array<number>(max - min)
        .fill(min)
        .map((val, idx) => val + idx);
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
                            styles={selectStyles<true, { label: string, value: string }>()}
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

export default OptionsMenu;
