import { CSSProperties } from 'react';
import _ from 'lodash';
import ColorScheme from '../../customization/ColorScheme';
import allImages from '../Images';
import keyDownWrapper from '../../KeyDownWrapper';
import { useDerivedState, useDispatch } from '../../newApp/Context';
import { Items } from '../../newApp/State';

type CounterItemProps = {
    images?: string[];
    itemName: Items;
    imgWidth: number;
    ignoreItemClass: boolean;
    styleProps?: CSSProperties;
    grid?: boolean;
    asSpan?: boolean;
    colorScheme: ColorScheme;
    fontSize: number;
};

const CounterItem = (props: CounterItemProps) => {
    const {
        images,
        itemName,
        imgWidth,
        ignoreItemClass,
        grid,
        asSpan,
        colorScheme,
        fontSize,
    } = props;

    const dispatch = useDispatch();

    const styleProps = props.styleProps || {};

    const handleClick = (e: React.UIEvent) => {
        if (e.type === 'contextmenu') {
            dispatch({ type: 'onItemClick', item: itemName, take: true });
            e.preventDefault();
        } else {
            dispatch({ type: 'onItemClick', item: itemName, take: false });
        }
    };

    const current = useDerivedState().itemCount[itemName] ?? 0;

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
    const image = current === 0 ? itemImages[0] : itemImages[1];
    styleProps.position = 'relative';
    styleProps.textAlign = 'center';
    const className = ignoreItemClass ? '' : 'item';

    if (asSpan) {
        return (
            <span
                className={`item-container ${className}`}
                style={styleProps}
                onClick={handleClick}
                onContextMenu={handleClick}
                onKeyDown={keyDownWrapper(handleClick)}
                role="button"
                tabIndex={0}
            >
                <img src={image} alt={itemName} width={imgWidth} />
                {current > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: colorScheme.background,
                            width: '80%',
                            height: '150%',
                            color: colorScheme.text,
                            fontSize,
                            pointerEvents: 'none',
                        }}
                    >
                        <p
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            {current}
                        </p>
                    </div>
                )}
            </span>
        );
    }
    return (
        <div
            className={`item-container ${className}`}
            style={styleProps}
            onClick={handleClick}
            onContextMenu={handleClick}
            onKeyDown={keyDownWrapper(handleClick)}
            role="button"
            tabIndex={0}
        >
            <img src={image} alt={itemName} width={imgWidth} />
            {current > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'grey',
                        width: '40%',
                        height: '60%',
                        color: colorScheme.text,
                        fontSize,
                        pointerEvents: 'none',
                    }}
                >
                    <p
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        {current}
                    </p>
                </div>
            )}
        </div>
    );
};

export default CounterItem;
