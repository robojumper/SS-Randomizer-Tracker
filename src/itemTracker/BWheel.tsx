import Item from './Item';
import wheel from '../assets/b wheel.png';
import { useSelector } from 'react-redux';
import { tumbleweedSelector } from '../customization/selectors';

type BWheelProps = {
    width: number;
};

const BWheel = ({ width: wid }: BWheelProps) => {

    const beetleWidth = wid / 5.2;
    const slingshotWidth = wid / 6.5;
    const bombsWidth = wid / 6.5;
    const bugNetWidth = wid / 6.5;
    const bowWidth = wid / 5.5;
    const clawshotsWidth = wid / 4.6;
    const whipWidth = wid / 5.5;
    const bellowsWidth = wid / 5.2;
    const tumbleweedWidth = wid / 6;

    const tumbleWeed = useSelector(tumbleweedSelector);

    return (
        <div id="BWheel">
            <img src={wheel} alt="" width={wid} />
            <div
                id="beetle"
                style={{
                    position: 'relative',
                    bottom: wid / 1.75 + 600 / wid,
                    left: wid / 1.33,
                }}
            >
                <Item itemName="Progressive Beetle" imgWidth={beetleWidth} />
            </div>
            <div
                id="slingshot"
                style={{
                    position: 'relative',
                    bottom: wid / 3.85 + 600 / wid,
                    left: wid / 2.3,
                }}
            >
                <Item
                    itemName="Progressive Slingshot"
                    imgWidth={slingshotWidth}
                />
            </div>
            <div
                id="bombs"
                style={{
                    position: 'relative',
                    bottom: wid / 1.22 + 600 / wid,
                    left: wid / 1.51,
                }}
            >
                <Item itemName="Bomb Bag" imgWidth={bombsWidth} />
            </div>
            <div
                id="bugnet"
                style={{
                    position: 'relative',
                    bottom: wid / 2.9 + 600 / wid,
                    left: wid / 1.51,
                }}
            >
                <Item itemName="Progressive Bug Net" imgWidth={bugNetWidth} />
            </div>
            <div
                id="bow"
                style={{
                    position: 'relative',
                    bottom: wid / 1.09 + 600 / wid,
                    left: wid / 2.4,
                }}
            >
                <Item itemName="Progressive Bow" imgWidth={bowWidth} />
            </div>
            <div
                id="clawshots"
                style={{
                    position: 'relative',
                    bottom: wid / 2.9 + 600 / wid,
                    left: wid / 6.8,
                }}
            >
                <Item itemName="Clawshots" imgWidth={clawshotsWidth} />
            </div>
            <div
                id="whip"
                style={{
                    position: 'relative',
                    bottom: wid / 1.75 + 600 / wid,
                    left: wid / 13,
                }}
            >
                <Item itemName="Whip" imgWidth={whipWidth} />
            </div>
            <div
                id="gustBellows"
                style={{
                    position: 'relative',
                    bottom: wid / 1.22 + 600 / wid,
                    left: wid / 6,
                }}
            >
                <Item itemName="Gust Bellows" imgWidth={bellowsWidth} />
            </div>
            {tumbleWeed && <div
                id="gustBellows"
                style={{
                    position: 'relative',
                    bottom: wid / 1.75 + 600 / wid,
                    left: wid / 2.4,
                }}
            >
                <Item itemName="Tumbleweed" imgWidth={tumbleweedWidth} />
            </div>}
        </div>
    );
};

export default BWheel;
