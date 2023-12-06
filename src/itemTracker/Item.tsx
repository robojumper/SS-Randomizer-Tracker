import { CSSProperties } from 'react';
import allImages from './Images';
import keyDownWrapper from '../KeyDownWrapper';
import { Items } from '../logic/Inventory';
import { useDispatch, useSelector } from 'react-redux';
import { rawItemCountSelector } from '../tracker/selectors';
import { clickItem } from '../tracker/slice';

type ItemProps = {
    images?: string[];
    itemName: Items;
    imgWidth?: number | string;
    ignoreItemClass?: boolean;
    styleProps?: CSSProperties;
    grid?: boolean;
};

const Item = (props: ItemProps) => {
    const {
        itemName,
        ignoreItemClass,
        images,
        styleProps,
        grid,
        imgWidth,
    } = props;

    const dispatch = useDispatch();
    const count = useSelector(rawItemCountSelector(itemName));
    const className = ignoreItemClass ? '' : 'item';

    let itemImages: string[];
    if (!images) {
        if (grid) {
            itemImages = allImages[`${itemName} Grid`];
        } else {
            itemImages = allImages[itemName];
        }
    } else {
        itemImages = images;
    }

    const style = styleProps;

    const handleClick = (e: React.UIEvent) => {
        if (e.type === 'contextmenu') {
            dispatch(clickItem({ item: itemName, take: true }));
            e.preventDefault();
        } else {
            dispatch(clickItem({ item: itemName, take: false }));
        }
    };

    return (
        <div
            className={`item-container ${className}`}
            style={style}
            onClick={handleClick}
            onContextMenu={handleClick}
            onKeyDown={keyDownWrapper(handleClick)}
            role="button"
            tabIndex={0}
        >
            <img src={itemImages[count]} alt={itemName} width={imgWidth} />
        </div>
    );
};

export default Item;
