import * as ContextMenu from '@radix-ui/react-context-menu';
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react';
import { mapValues } from '../../utils/Collections';
import styles from './ContextMenu.module.css';

type NativeTriggerEvent = MouseEvent | TouchEvent | KeyboardEvent;

export type TriggerEvent =
    | React.MouseEvent
    | React.TouchEvent
    | React.KeyboardEvent;

// The idea here was to expose an API similar to react-contexify,
// which uses explicit open triggers. Unfortunately, radix ContextMenu
// cannot be controlled, which is why we hackily trigger a manual
// event and do not actually use all of this state.
//
// TODO: Probably should instead stop using this "global context menu"
// concept entirely, but that requires rethinking our components a bit
// since Trigger+asChild relies on passing down and merging various props again.
interface ContextMenuData {
    isOpen: boolean;
    props: unknown;
    x: number;
    y: number;
}

interface ContextMenusState {
    menus: Record<string, ContextMenuData>;
}

interface ContextMenusActions {
    close: () => void;
    open: (id: string, x: number, y: number, props: unknown) => void;
}

const ReactStateContext = createContext<ContextMenusState | null>(null);
const ReactActionsContext = createContext<ContextMenusActions | null>(null);

export function ContextMenuContext({
    children,
}: {
    children: React.ReactNode;
}) {
    const [state, setState] = useState<ContextMenusState>({ menus: {} });
    const close = useCallback(() => {
        setState((oldState) => ({
            menus: mapValues(oldState.menus, (v) => ({
                ...v,
                isOpen: false,
            })),
        }));
    }, []);
    const open = useCallback(
        (id: string, x: number, y: number, props: unknown) => {
            close();
            setState((oldState) => ({
                menus: {
                    ...oldState.menus,
                    [id]: { isOpen: true, x, y, props },
                },
            }));
            document.getElementById(`tracker-ctx-${id}`)!.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    clientX: x,
                    clientY: y,
                }),
            );
        },
        [close],
    );
    const actions: ContextMenusActions = useMemo(
        () => ({ open, close }),
        [close, open],
    );
    return (
        <ReactStateContext value={state}>
            <ReactActionsContext value={actions}>
                {children}
            </ReactActionsContext>
        </ReactStateContext>
    );
}

export function useContextMenu<T extends object>(id: string) {
    const actions = useContext(ReactActionsContext)!;
    return useCallback(
        (event: TriggerEvent, props: T) => {
            event.preventDefault();
            const nativeEvent: NativeTriggerEvent =
                'nativeEvent' in event ? event.nativeEvent : event;
            let x: number, y: number;
            const target = nativeEvent.target as Element;
            if (nativeEvent instanceof KeyboardEvent) {
                x = target.clientLeft + target.clientWidth;
                y = target.clientTop + target.clientHeight;
            } else if (nativeEvent instanceof MouseEvent) {
                x = nativeEvent.clientX;
                y = nativeEvent.clientY;
            } else {
                return;
            }
            actions.open(id, x, y, props);
        },
        [actions, id],
    );
}

function useCloseContextMenu() {
    const actions = useContext(ReactActionsContext)!;
    return useCallback(() => {
        actions.close();
    }, [actions]);
}

function useContextMenuState<T>(id: string) {
    const state = useContext(ReactStateContext)!;
    const thisState = state.menus[id];
    return useMemo(() => {
        if (!thisState || !thisState.isOpen) {
            return undefined;
        }
        return { x: thisState.x, y: thisState.y, props: thisState.props as T };
    }, [thisState]);
}

const ItemProps = createContext<unknown>(undefined);

export function Menu({
    children,
    id,
}: {
    children: React.ReactNode;
    id: string;
}) {
    const state = useContextMenuState(id);
    const close = useCloseContextMenu();
    return (
        <ItemProps value={state?.props}>
            <ContextMenu.Root
                // open={Boolean(state)}
                onOpenChange={(open) => {
                    if (!open) {
                        close();
                    }
                }}
            >
                <ContextMenu.Trigger>
                    <div
                        id={`tracker-ctx-${id}`}
                        style={{
                            display:
                                'none' /* , top: state?.y, left: state?.x */,
                        }}
                    />
                </ContextMenu.Trigger>
                <ContextMenu.Portal>
                    <ContextMenu.Content
                        onCloseAutoFocus={(e) => e.preventDefault()}
                        className={styles.content}
                        // style={{ top: state?.y, left: state?.x }}
                    >
                        {children}
                    </ContextMenu.Content>
                </ContextMenu.Portal>
            </ContextMenu.Root>
        </ItemProps>
    );
}

export function Separator() {
    return <ContextMenu.Separator className={styles.separator} />;
}

export function Submenu({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={styles.subTrigger}>
                {label}
                <div className={styles.rightSlot}>›</div>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
                <ContextMenu.SubContent className={styles.subContent}>
                    {children}
                </ContextMenu.SubContent>
            </ContextMenu.Portal>
        </ContextMenu.Sub>
    );
}

export type ItemParams<P, T> = { data: T | undefined; props: P };

export function Item<T, P>({
    children,
    data,
    onClick,
}: {
    children: React.ReactNode;
    data?: T;
    onClick: (arg: ItemParams<P, T>) => void;
}) {
    const props = useContext(ItemProps);
    return (
        <ContextMenu.Item
            className={styles.item}
            onClick={() => {
                onClick({ data, props: props as P });
            }}
        >
            {children}
        </ContextMenu.Item>
    );
}
