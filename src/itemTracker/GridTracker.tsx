import { CSSProperties } from 'react';
import Item from './Item';
import CrystalCounter from './items/sidequest/CrystalCounter';
import GratitudeCrystals from './items/sidequest/GratitudeCrystals';

import noTablets from '../assets/tablets/no_tablets.png';
import CounterItem from './items/CounterItem';
import { useDispatch, useSelector } from 'react-redux';
import { rawItemCountSelector, totalGratitudeCrystalsSelector } from '../tracker/selectors';
import { clickItem } from '../tracker/slice';
import { tumbleweedSelector } from '../customization/selectors';

type GridTrackerProps = {
    width: number;
    maxHeight: number;
    mapMode: boolean;
};

const GridTracker = ({ maxHeight, width, mapMode: map }: GridTrackerProps) => {
    const dispatch = useDispatch();
    const handleExtraWalletClick = () => {
        dispatch(clickItem({ item: 'Extra Wallet', take: false }));
    };

    const emeraldTabletStyle: CSSProperties = {
        position: 'absolute',
        left: '100%',
        bottom: '0%',
        transform: 'translate(-100%)',
    };

    const rubyTabletStyle: CSSProperties = {
        position: 'absolute',
        left: '100%',
        top: '0%',
        transform: 'translate(-100%)',
    };

    const amberTabletStyle: CSSProperties = {
        position: 'absolute',
        left: '0%',
        top: '0%',
    };

    let imgWidth = width / 10;
    const fraction = (map ? 10 : 8)
    if (maxHeight < imgWidth * fraction) {
        imgWidth = maxHeight / fraction;
    }

    const tableStyle = {
        marginTop: (map ? (imgWidth / 1.5) + 50 : 0),
    }
    const emptyTabWidth = imgWidth * 2.5;
    const emeraldWidth = emptyTabWidth * 0.54;
    const rubyWidth = emptyTabWidth * 0.74;
    const amberWidth = emptyTabWidth * 0.505;

    const walletCount = useSelector(rawItemCountSelector('Extra Wallet')) ?? 0;
    const crystalCount = useSelector(totalGratitudeCrystalsSelector);
    const tumbleweed = useSelector(tumbleweedSelector);

    return (
        <table style={tableStyle}>
            <tbody>
                <tr>
                    <td rowSpan={2}>
                        <Item
                            itemName="Progressive Sword"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Progressive Beetle"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Progressive Slingshot"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Bomb Bag"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Progressive Bug Net"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td rowSpan={2} colSpan={2}>
                        <div style={{ position: 'relative' }}>
                            <img src={noTablets} alt="" width={emptyTabWidth} />
                            <div style={amberTabletStyle}>
                                <Item
                                    imgWidth={amberWidth}
                                    itemName="Amber Tablet"
                                    ignoreItemClass
                                />
                            </div>
                            <div style={emeraldTabletStyle}>
                                <Item
                                    imgWidth={emeraldWidth}
                                    itemName="Emerald Tablet"
                                    ignoreItemClass
                                />
                            </div>
                            <div style={rubyTabletStyle}>
                                <Item
                                    imgWidth={rubyWidth}
                                    itemName="Ruby Tablet"
                                    ignoreItemClass
                                />
                            </div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <Item
                            itemName="Progressive Bow"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Clawshots"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Whip"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Gust Bellows"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                </tr>
                <tr>
                    <td>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'small',
                            }}
                        >
                            Caves
                        </p>
                        <Item
                            itemName="Lanayru Caves Small Key"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Sea Chart"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Spiral Charge"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Progressive Pouch"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <CounterItem
                            itemName="Empty Bottle"
                            imgWidth={imgWidth}
                            fontSize={imgWidth * 0.5}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <div style={{ position: 'relative', top: '-5px' }}>
                            <Item
                                itemName="Progressive Wallet"
                                imgWidth={imgWidth}
                            />
                        </div>
                        <div
                            style={{
                                position: 'relative',
                                left: '0%',
                                top: '20px',
                            }}
                            onClick={handleExtraWalletClick}
                            onKeyDown={handleExtraWalletClick}
                            tabIndex={0}
                            role="button"
                        >
                            <CrystalCounter
                                current={`+${walletCount * 300}`}
                                fontSize={imgWidth * 0.4}
                            />
                        </div>
                    </td>
                    <td>
                        <Item
                            itemName="Progressive Mitts"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                </tr>
                <tr>
                    <td>
                        <Item
                            itemName="Goddess's Harp"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Ballad of the Goddess"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Farore's Courage"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Nayru's Wisdom"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Din's Power"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <div style={{ position: 'relative' }}>
                            <CounterItem
                                itemName="Song of the Hero"
                                imgWidth={imgWidth}
                                fontSize={imgWidth * 0.5}
                                grid
                                ignoreItemClass
                            />
                        </div>
                    </td>
                    <td>
                        <Item
                            itemName="Triforce"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                </tr>
                <tr>
                    <td>
                        <Item
                            itemName="Water Dragon's Scale"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Fireshield Earrings"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Cawlin's Letter"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Horned Colossus Beetle"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Baby Rattle"
                            imgWidth={imgWidth}
                            grid
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <div>
                            <GratitudeCrystals imgWidth={imgWidth} grid />
                        </div>
                        <div
                            style={{
                                position: 'relative',
                                bottom: '100%',
                                pointerEvents: 'none',
                            }}
                        >
                            <CrystalCounter
                                current={crystalCount}
                                fontSize={imgWidth * 0.5}
                            />
                        </div>
                    </td>
                    <td>
                        <Item
                            itemName="Life Tree Fruit"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                </tr>
                <tr>
                    <td>
                        <CounterItem
                            itemName="Group of Tadtones"
                            fontSize={imgWidth / 2}
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    <td>
                        <Item
                            itemName="Scrapper"
                            imgWidth={imgWidth}
                            ignoreItemClass
                        />
                    </td>
                    {tumbleweed && (
                        <td>
                            <Item
                                itemName="Tumbleweed"
                                imgWidth={imgWidth}
                                ignoreItemClass
                            />
                        </td>
                    )}
                </tr>
            </tbody>
        </table>
    );
};

export default GridTracker;
