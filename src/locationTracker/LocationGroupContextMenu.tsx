import _ from 'lodash';
import { useCallback } from 'react';
import { Menu, Item, Separator, Submenu, ItemParams } from 'react-contexify';
import { LocationGroupContextMenuProps } from './LocationGroupHeader';
import { useDispatch } from '../newApp/Context';

const bosses = {
    0: 'Ghirahim 1',
    1: 'Scaldera',
    2: 'Moldarach',
    3: 'Koloktos',
    4: 'Tentalus',
    5: 'Ghirahim 2',
};

type CtxProps<T = void> = ItemParams<LocationGroupContextMenuProps, T>;

interface BossData {
    boss: number;
}

function LocationGroupContextMenu() {
    const dispatch = useDispatch();
    
    const checkAll = useCallback((params: CtxProps) => dispatch({
        type: 'bulkEditChecks',
        checks: params.props!.area.checks.map((check) => check.checkId),
        check: true,
    }), [dispatch]);

    const uncheckAll = useCallback((params: CtxProps) => dispatch({
        type: 'bulkEditChecks',
        checks: params.props!.area.checks.map((check) => check.checkId),
        check: false,
    }), [dispatch]);

    const handlePathClick = useCallback((params: CtxProps<BossData>) => dispatch({
        type: 'setHint',
        area: params.props!.area.name,
        hint: { type: 'path', index: params.data!.boss },
    }), [dispatch]);

    const handleSotsClick = useCallback((params: CtxProps) => dispatch({
        type: 'setHint',
        area: params.props!.area.name,
        hint: { type: 'sots' },
    }), [dispatch]);

    const handleBarrenClick = useCallback((params: CtxProps) => dispatch({
        type: 'setHint',
        area: params.props!.area.name,
        hint: { type: 'barren' },
    }), [dispatch]);

    const handleClearCheck = useCallback((params: CtxProps) => dispatch({
        type: 'setHint',
        area: params.props!.area.name,
        hint: undefined,
    }), [dispatch]);

    return (
        <Menu id="group-context">
            <Item onClick={checkAll}>Check All</Item>
            <Item onClick={uncheckAll}>Uncheck All</Item>
            <Separator />
            <Submenu label="Set Path">
                {
                    _.map(bosses, (bossName, bossIndex) => (
                        <Item key={bossName} onClick={handlePathClick} data={{ boss: parseInt(bossIndex, 10) } satisfies BossData}>{bossName}</Item>
                    ))
                }
            </Submenu>
            <Item onClick={handleSotsClick}>Set SotS</Item>
            <Item onClick={handleBarrenClick}>Set Barren</Item>
            <Item onClick={handleClearCheck}>Clear Hint</Item>
        </Menu>
    );
}

export default LocationGroupContextMenu;
