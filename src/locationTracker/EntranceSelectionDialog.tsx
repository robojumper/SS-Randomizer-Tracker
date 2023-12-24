import { useDispatch, useSelector } from 'react-redux';
import {
    exitsSelector,
    remainingEntrancesSelector,
} from '../tracker/selectors';
import { useMemo } from 'react';
import Select, { ActionMeta, SingleValue } from 'react-select';
import { mapEntrance } from '../tracker/slice';
import { Button, Modal, Row } from 'react-bootstrap';
import { selectStyles } from '../customization/ComponentStyles';

type Entrance = {
    value: string;
    label: string;
};

const RESET_OPTION = 'RESET';

function EntranceSelectionDialog({
    exitId,
    show,
    onHide,
}: {
    exitId: string;
    show: boolean;
    onHide: () => void;
}) {
    const dispatch = useDispatch();
    const exits = useSelector(exitsSelector);
    const remainingEntrances = useSelector(remainingEntrancesSelector);
    const exit = exits.find((e) => e.exit.id === exitId)!;

    const entranceOptions: Entrance[] = useMemo(() => {
        const entrances = remainingEntrances.map(({ id, name }) => ({
            value: id,
            label: name,
        }));
        entrances.unshift({ value: RESET_OPTION, label: 'Reset' });
        return entrances;
    }, [remainingEntrances]);

    const onEntranceChange = (
        selectedOption: SingleValue<Entrance>,
        meta: ActionMeta<Entrance>,
    ) => {
        if (meta.action === 'select-option') {
            if (!selectedOption || selectedOption.value === RESET_OPTION) {
                dispatch(mapEntrance({ from: exitId, to: undefined }));
            } else {
                dispatch(
                    mapEntrance({ from: exitId, to: selectedOption.value }),
                );
            }
        }
    };

    const matches = (name: string, searchString: string) => {
        if (!searchString) {
            return true;
        }
        const fragments = searchString.split(' ');
        return fragments.every((fragment) => name.includes(fragment.trim()));
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" style={{ width: '90%' }}>
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    Select Entrance
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="show-grid">
                <Row style={{ paddingBottom: '3%' }}>
                    <Select
                        styles={selectStyles<false, Entrance>()}
                        value={
                            exit.entrance && {
                                label: exit.entrance.name,
                                value: exit.entrance.id,
                            }
                        }
                        onChange={onEntranceChange}
                        options={entranceOptions}
                        name={exit.entrance?.name}
                        isDisabled={!exit.canAssign}
                        filterOption={(option, search) =>
                            matches(
                                option.data.label.toLowerCase(),
                                search.toLowerCase(),
                            )
                        }
                    />
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default EntranceSelectionDialog;
