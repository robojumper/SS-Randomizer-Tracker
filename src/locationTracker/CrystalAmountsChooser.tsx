import { range } from 'es-toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { numBatreauxRewardLevels } from '../logic/ThingsThatWouldBeNiceToHaveInTheDump';
import { requiredCrystalCountsSelector } from '../tracker/Selectors';
import { setRequiredCrystalCounts } from '../tracker/Slice';
import styles from './CrystalAmountsChooser.module.css';

export function CrystalAmountsChooser() {
    // TODO: This setup is pretty bad because every number typed
    // commits the result directly to Redux and that causes the
    // tooltips worker to restart etc. Doesn't seem to be a huge
    // problem yet but maybe there's a more efficient design.
    const dispatch = useDispatch();
    const counts = useSelector(requiredCrystalCountsSelector);
    const updateCount = (val: string, idx: number) => {
        let num;
        if (val === '') {
            num = 0;
        } else {
            num = parseInt(val, 10);
            if (isNaN(num) || num < 0 || num > 80) {
                return;
            }
        }
        const newCounts = [...counts];
        newCounts[idx] = num;
        dispatch(setRequiredCrystalCounts(newCounts));
    };
    return (
        <div className={styles.chooser}>
            <div>Enter Crystal Counts:</div>
            <div className={styles.inputs}>
                {range(numBatreauxRewardLevels).map((level) => (
                    <div key={level}>
                        <input
                            className="form-control"
                            type="text"
                            value={counts[level]}
                            onChange={(e) => updateCount(e.target.value, level)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
