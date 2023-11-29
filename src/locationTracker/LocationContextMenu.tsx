import _ from 'lodash';
import { useCallback } from 'react';
import { Menu, Item, Separator, Submenu, ItemParams } from 'react-contexify';

import hintItems from '../data/hintItems.json';
import { useDispatch } from '../newApp/Context';
import { LocationContextMenuProps } from './Location';

type CtxProps<T = void> = ItemParams<LocationContextMenuProps, T>;
interface ItemData {
    item: string;
}

export default function LocationContextMenu() {
    const dispatch = useDispatch();

    const handleCheckClick = useCallback(
        (params: CtxProps) =>
            dispatch({
                type: 'onCheckClick',
                check: params.props!.checkId,
                markChecked: true,
            }),
        [dispatch],
    );

    const handleUncheckClick = useCallback(
        (params: CtxProps) =>
            dispatch({
                type: 'onCheckClick',
                check: params.props!.checkId,
                markChecked: false,
            }),
        [dispatch],
    );

    const handleSetItemClick = useCallback(
        (params: CtxProps<ItemData>) =>
            dispatch({
                type: 'setCheckHint',
                checkId: params.props!.checkId,
                hintItem: params.data!.item,
            }),
        [dispatch],
    );

    const handleClearItemClick = useCallback(
        (params: CtxProps<ItemData>) =>
            dispatch({
                type: 'setCheckHint',
                checkId: params.props!.checkId,
                hintItem: undefined,
            }),
        [dispatch],
    );

    return (
        <Menu id="location-context">
            <Item onClick={handleCheckClick}>Check</Item>
            <Item onClick={handleUncheckClick}>Uncheck</Item>
            <Separator />
            <Submenu label="Set Item">
                {_.map(hintItems, (items, category) => (
                    <Submenu key={category} label={category}>
                        {_.map(items, (listItem) => (
                            <Item
                                key={listItem}
                                onClick={handleSetItemClick}
                                data={{ item: listItem } satisfies ItemData}
                            >
                                {listItem}
                            </Item>
                        ))}
                    </Submenu>
                ))}
            </Submenu>
            <Item onClick={handleClearItemClick}>Clear Item</Item>
        </Menu>
    );
}
