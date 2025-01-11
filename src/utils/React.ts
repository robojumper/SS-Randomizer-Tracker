import useResizeObserver from '@react-hook/resize-observer';
import React, {
    cloneElement,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { useDispatch } from 'react-redux';
import type { AppAction } from '../store/Store';

/** places a divider between each element of arr */
export function addDividers<T extends React.ReactNode>(
    arr: T[],
    divider: React.ReactElement,
): React.ReactNode[] {
    return arr.flatMap((e, i) => [
        // eslint-disable-next-line @eslint-react/no-clone-element
        i ? cloneElement(divider, { key: `divider-${i}` }) : null,
        e,
    ]);
}

/**
 * Measure an unconditionally rendered element's size.
 * Ref must be set after the first render and stable
 * after that, since we don't react to ref changes.
 */
export function useElementSize(ref: React.RefObject<HTMLElement | null>) {
    const [measuredWidth, setMeasuredWidth] = useState(0);
    const [measuredHeight, setMeasuredHeight] = useState(0);

    useLayoutEffect(() => {
        const elem = ref.current;
        if (!elem) {
            return;
        }
        setMeasuredWidth(elem.clientWidth);
        setMeasuredHeight(elem.clientHeight);
    }, [ref]);

    useResizeObserver(ref, () => {
        const elem = ref.current;
        if (!elem) {
            return;
        }
        setMeasuredWidth(elem.clientWidth);
        setMeasuredHeight(elem.clientHeight);
    });

    return { measuredWidth, measuredHeight };
}

/**
 * Pull an initial value from Redux, store it in local state,
 * and only commit when unmounting (or explicitly calling `storeCurrentState`).
 *
 * https://dev.to/ietxaniz/deferred-redux-update-pattern-1d33
 */
export const useDeferredReduxUpdate = <T>(
    initialState: T,
    updateAction: (arg: T) => AppAction,
) => {
    // All of this is a crutch, especially `isInitialized`,
    // which hacks around React Strict Mode behavior.
    const [state, setState] = useState(initialState);
    const [isInitialized, setIsInitialized] = useState(false);
    const dispatch = useDispatch();

    const cleanupRef = useRef(() => {});

    cleanupRef.current = () => {
        if (isInitialized) {
            dispatch(updateAction(state));
        }
    };

    useEffect(() => {
        setIsInitialized(true);
        return () => cleanupRef.current();
    }, []);

    const storeCurrentState = cleanupRef.current;

    return [state, setState, storeCurrentState] as const;
};
