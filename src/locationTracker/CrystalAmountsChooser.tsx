import { range } from 'es-toolkit';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { numBatreauxRewardLevels } from '../logic/ThingsThatWouldBeNiceToHaveInTheDump';
import { requiredCrystalCountsSelector } from '../tracker/Selectors';
import { setRequiredCrystalCounts } from '../tracker/Slice';
import { useDeferredReduxUpdate } from '../utils/React';
import styles from './CrystalAmountsChooser.module.css';

export function CrystalAmountsChooser() {
    const reduxCounts = useSelector(requiredCrystalCountsSelector);
    const [crystalCounts, setCrystalCounts, flushCrystalCounts] =
        useDeferredReduxUpdate(
            reduxCounts.map((i) => i.toString(10)),
            (counts) => {
                const newCounts = [...reduxCounts];
                for (let i = 0; i < numBatreauxRewardLevels; i++) {
                    const num = parseInt(counts[i], 10);
                    newCounts[i] = num;
                }
                return setRequiredCrystalCounts(newCounts);
            },
        );

    // Pull new state from Redux if it changes for some other reason
    const [prevCounts, setPrevCounts] = useState(reduxCounts);
    if (reduxCounts !== prevCounts) {
        setCrystalCounts(reduxCounts.map((i) => i.toString(10)));
        setPrevCounts(reduxCounts);
    }

    const updateCount = (val: string, idx: number) => {
        const newCounts = [...crystalCounts];
        newCounts[idx] = val;
        setCrystalCounts(newCounts);
    };

    return (
        <div className={styles.chooser}>
            <div>Enter Crystal Counts:</div>
            <div className={styles.inputs}>
                {range(numBatreauxRewardLevels).map((level) => (
                    <div key={level}>
                        <input
                            className="tracker-input"
                            type="text"
                            value={crystalCounts[level]}
                            onChange={(e) => updateCount(e.target.value, level)}
                            onBlur={flushCrystalCounts}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
