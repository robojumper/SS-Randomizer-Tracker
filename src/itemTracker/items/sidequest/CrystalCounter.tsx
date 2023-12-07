type CrystalCounterProps = {
    current: string | number;
    fontSize: number;
};

const CrystalCounter = ({ current, fontSize }: CrystalCounterProps) => (
    <p style={{ fontSize, margin: 0 }}>
        {current}
    </p>
);

export default CrystalCounter;
