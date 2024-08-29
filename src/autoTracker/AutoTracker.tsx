import { useEffect } from 'react';
import { useAppDispatch } from '../store/store';
import { createConnection } from './Socket';
import _ from 'lodash';
import { setItemCounts } from '../tracker/slice';

export function useAutoTracker() {
    const dispatch = useAppDispatch();
    useEffect(() => {
        const connection = createConnection((msg) => {
            if (msg.type === 'item_counts') {
                dispatch(setItemCounts(msg.counts));
            }
        }, _.noop);

        return () => connection.close();
    }, [dispatch]);
}
