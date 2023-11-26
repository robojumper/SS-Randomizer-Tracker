import { CSSProperties } from 'react';
import allImages from './Images';
import keyDownWrapper from '../KeyDownWrapper';
import { useDispatch, useTrackerState } from '../newApp/Context';
import { Items } from '../newApp/State';

type ItemProps = {
    images?: string[];
    itemName: Items;
    imgWidth?: number;
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
    const count = useTrackerState().state.acquiredItems[itemName] ?? 0;
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
            dispatch({type: 'onItemClick', item: itemName, take: true });
            e.preventDefault();
        } else {
            dispatch({type: 'onItemClick', item: itemName, take: false });
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
