import _ from 'lodash';
import { useCallback, useMemo, useState } from 'react';
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
import { useDispatch, useTrackerState } from './Context';
import 'tippy.js/dist/tippy.css';
import { OptionDefs, Option, OptionValue } from '../permalink/SettingsTypes';
import { decodePermalink, encodePermalink } from '../permalink/Settings';
import Tippy from '@tippyjs/react';
// import EntranceGraph from './EntranceGraph';

function OptionsMenu({
    onHide,
    options,
}: {
    onHide: () => void;
    options: OptionDefs;
}) {
    const trackerState = useTrackerState();
    const dispatch = useDispatch();

    const [tempSettings, setTempSettings] = useState(
        trackerState.state.settings,
    );

    const permalink = useMemo(
        () => encodePermalink(options, tempSettings),
        [options, tempSettings],
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

    const onAccept = useCallback(() => {
        dispatch({
            type: 'acceptSettings',
            settings: tempSettings,
        });
        onHide();
    }, [dispatch, onHide, tempSettings]);

    const onAcceptWithReset = useCallback(() => {
        dispatch({
            type: 'reset',
            settings: tempSettings,
        });
        onHide();
    }, [dispatch, onHide, tempSettings]);

    return (
        <Modal show={true} size="lg" style={{ width: '90%' }}>
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    Options
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="show-grid">
                <Row style={{ paddingBottom: '3%' }}>
                    <Col>
                        <input
                            type="text"
                            placeholder="Permalink"
                            onChange={(e) => onChangePermalink(e.target.value)}
                            value={permalink}
                            style={{ width: '100%' }}
                        />
                    </Col>
                </Row>

                <Row style={{ height: '600px', overflowY: 'auto' }}>
                    {options
                        .filter((def) => def.permalink !== false)
                        .map((def) => (
                            <Row key={def.name}>
                                <Setting
                                    def={def}
                                    value={tempSettings[def.command]}
                                    setValue={(value) =>
                                        setTempSettings((existing) => ({
                                            ...existing,
                                            [def.command]: value,
                                        }))
                                    }
                                />
                            </Row>
                        ))}
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={onAccept}>Accept</Button>
                <Button onClick={onAcceptWithReset}>Accept and Reset</Button>
                <Button onClick={onHide}>Cancel</Button>
            </Modal.Footer>
        </Modal>
        // <EntranceGraph />
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
                            {def.choices.map((val) => (
                                <option key={val}>{val}</option>
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
