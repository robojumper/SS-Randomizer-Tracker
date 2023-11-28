import _ from 'lodash';
import { useMemo, useState } from 'react';
import {
    Modal,
    Button,
    Row,
    Col,
    FormCheck,
    FormControl,
} from 'react-bootstrap';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import Select, { ActionMeta, SingleValue } from 'react-select';
import { ModalCloseCallback } from '../callbacks';
import { useDerivedState, useDispatch } from '../newApp/Context';
// import EntranceGraph from './EntranceGraph';

type EntranceTrackerProps = {
    show: boolean;
    onHide: ModalCloseCallback;
};

type Entrance = {
    value: string;
    label: string;
};

const RESET_OPTION = 'RESET';

function EntranceTracker({ show, onHide }: EntranceTrackerProps) {
    const state = useDerivedState();
    const dispatch = useDispatch();
    const exits = state.exits;
    
    const entranceOptions: Entrance[] = useMemo(() => {
        const entrances = state.remainingEntrances.map(({
            id, name
        }) => ({
            value: id,
            label: name
        }));
        entrances.unshift({ value: RESET_OPTION, label: 'Reset' });
        return entrances;
    }, [state.remainingEntrances]);

    const [exitSearch, setExitSearch] = useState('');
    const [entranceSearch, setEntranceSeach] = useState('');
    const [clickthrough, setClickthrough] = useState(true);

    const clearFilters = () => {
        setExitSearch('');
        setEntranceSeach('');
    };

    const onEntranceChange = 
        (
            from: string,
            selectedOption: SingleValue<Entrance>,
            meta: ActionMeta<Entrance>,
        ) => {
            if (meta.action === 'select-option') {
                if (!selectedOption || selectedOption.value === RESET_OPTION) {
                    dispatch({ type: 'mapEntrance', from, to: undefined })
                } else {
                    dispatch({ type: 'mapEntrance', from, to: selectedOption.value })
                }
            }
        };

    const row = ({ index, style }: ListChildComponentProps) => {
        const exit = exits[index];
        return (
            <Row
                key={exit.exit.id}
                style={{
                    ...style,
                    borderBottom: '1px solid black',
                    paddingTop: '1%',
                    backgroundColor: !exit.canAssign ? 'lightgrey' : undefined,
                }}
            >
                <Col style={{ display: 'flex', alignItems: 'center' }}><span>{exit.exit.name}</span></Col>
                <Col>
                    <Select
                        value={exit.entrance && { label: exit.entrance.name, value: exit.entrance.id }}
                        onChange={(...args) => onEntranceChange(exit.exit.id, ...args)}
                        options={entranceOptions}
                        name={exit.entrance?.name}
                        isDisabled={!exit.canAssign}
                    />
                </Col>
                <Col xs="auto">
                    <Button
                        disabled={!exit.entrance}
                        onClick={() =>
                            setExitSearch(
                                exit.entrance?.name.split('(')[0] ?? '',
                            )
                        }
                    >
                        Go to
                    </Button>
                </Col>
            </Row>
        );
    };
    return (
        <Modal show={show} onHide={onHide} size="lg" style={{ width: '90%' }}>
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    Entrances
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="show-grid">
                <Row style={{ paddingBottom: '3%' }}>
                    <Col>
                        <FormControl
                            type="search"
                            placeholder="Search exits"
                            onChange={(e) => setExitSearch(e.target.value)}
                            value={exitSearch}
                        />
                    </Col>
                    <Col className="vr" style={{ background: 'white' }} />
                    <Col>
                        <FormControl
                            type="search"
                            placeholder="Search entrances"
                            onChange={(e) => setEntranceSeach(e.target.value)}
                            value={entranceSearch}
                        />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <FormCheck
                            type="switch"
                            label="Clickthrough"
                            id="clickthrough"
                            checked={clickthrough}
                            onChange={() => setClickthrough(!clickthrough)}
                        />
                    </Col>
                    <Col className="vr" style={{ background: 'white' }} />
                    <Col style={{ justifyContent: 'end' }}>
                        <Button onClick={clearFilters}>Clear Filters</Button>
                    </Col>
                </Row>
                <List
                    itemCount={exits.length}
                    height={600}
                    width=""
                    itemSize={60}
                >
                    {row}
                </List>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
        // <EntranceGraph />
    );
}

export default EntranceTracker;
