import { useEffect } from 'react';
import { isItem, type InventoryItem } from '../logic/Inventory';
import { useAppDispatch } from '../store/Store';
import { setItemCounts } from '../tracker/Slice';
import { noop } from '../utils/Function';
import { createConnection } from './Socket';

export function useAutoTracker() {
    const dispatch = useAppDispatch();
    useEffect(() => {
        const connection = createConnection((msg) => {
            if (msg.type === 'item_counts') {
                const args: { item: InventoryItem; count: number }[] = [];
                for (const count of msg.counts) {
                    const item = count.item;
                    if (!isItem(item)) {
                        continue;
                    }
                    args.push({ item, count: count.count });
                }
                dispatch(setItemCounts(args));
            }
        }, noop);

        return () => connection.close();
    }, [dispatch]);
}
