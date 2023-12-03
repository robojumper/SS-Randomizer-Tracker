import _ from 'lodash';
import { useCallback } from 'react';
import { Menu, Item, Separator, Submenu, ItemParams } from 'react-contexify';

import hintItems from '../data/hintItems.json';
import { LocationContextMenuProps } from './Location';
import { useDispatch } from 'react-redux';
import { clickCheck, setCheckHint } from '../tracker/slice';

type CtxProps<T = void> = ItemParams<LocationContextMenuProps, T>;
interface ItemData {
    item: string;
}

export default function LocationContextMenu() {
    const dispatch = useDispatch();

    const handleCheckClick = useCallback(
        (params: CtxProps) =>
            dispatch(clickCheck({
                checkId: params.props!.checkId,
                markChecked: true,
            })),
        [dispatch],
    );

    const handleUncheckClick = useCallback(
        (params: CtxProps) =>
            dispatch(clickCheck({
                checkId: params.props!.checkId,
                markChecked: false,
            })),
        [dispatch],
    );

    const handleSetItemClick = useCallback(
        (params: CtxProps<ItemData>) =>
            dispatch(setCheckHint({
                checkId: params.props!.checkId,
                hint: params.data!.item,
            })),
        [dispatch],
    );

    const handleClearItemClick = useCallback(
        (params: CtxProps<ItemData>) =>
            dispatch(setCheckHint({
                checkId: params.props!.checkId,
                hint: undefined,
            })),
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
