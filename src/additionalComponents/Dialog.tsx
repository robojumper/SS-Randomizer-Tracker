import * as RadixAlertDialog from '@radix-ui/react-alert-dialog';
import * as RadixDialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { useCallback, useId } from 'react';
import styles from './Dialog.module.css';

function Root(
    props: RadixDialog.DialogProps & React.RefAttributes<HTMLDivElement>,
) {
    return <RadixDialog.Root {...props} />;
}

function Portal(
    props: RadixDialog.DialogPortalProps & React.RefAttributes<HTMLDivElement>,
) {
    return <RadixDialog.Portal {...props} />;
}

function Overlay(
    props: RadixDialog.DialogOverlayProps & React.RefAttributes<HTMLDivElement>,
) {
    const { className, ...rest } = props;
    return (
        <RadixDialog.Overlay
            className={clsx(className, styles.overlay)}
            {...rest}
        />
    );
}

function Content(
    props: RadixDialog.DialogContentProps &
        React.RefAttributes<HTMLDivElement> & { narrow?: boolean },
) {
    const { narrow, className, ...rest } = props;
    return (
        <RadixDialog.Content
            aria-describedby={undefined}
            className={clsx(className, styles.content, {
                [styles.narrow]: narrow,
            })}
            {...rest}
        />
    );
}

function Title(
    props: RadixDialog.DialogTitleProps & React.RefAttributes<HTMLDivElement>,
) {
    return <RadixDialog.Title {...props} />;
}

function Footer({ children }: { children: React.ReactNode }) {
    return <div className={styles.footer}>{children}</div>;
}

function Close(
    props: RadixDialog.DialogCloseProps &
        React.RefAttributes<HTMLButtonElement>,
) {
    return <RadixDialog.Close {...props} />;
}

export function Dialog({
    open,
    onOpenChange,
    title,
    wide,
    className,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    wide?: boolean;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <Root open={open} onOpenChange={onOpenChange}>
            <Portal>
                <Overlay />
                <Content narrow={!wide}>
                    <Title>{title}</Title>
                    <div className={className}>{children}</div>
                    <Footer>
                        <Close className="tracker-button">Close</Close>
                    </Footer>
                </Content>
            </Portal>
        </Root>
    );
}

function AlertRoot(
    props: RadixAlertDialog.AlertDialogProps &
        React.RefAttributes<HTMLDivElement>,
) {
    return <RadixAlertDialog.Root {...props} />;
}

function AlertPortal(
    props: RadixAlertDialog.AlertDialogPortalProps &
        React.RefAttributes<HTMLDivElement>,
) {
    return <RadixAlertDialog.Portal {...props} />;
}

function AlertOverlay(
    props: RadixAlertDialog.AlertDialogOverlayProps &
        React.RefAttributes<HTMLDivElement>,
) {
    const { className, ...rest } = props;
    return (
        <RadixAlertDialog.Overlay
            className={clsx(className, styles.overlay)}
            {...rest}
        />
    );
}

function AlertContent(
    props: RadixAlertDialog.AlertDialogContentProps &
        React.RefAttributes<HTMLDivElement> & { narrow?: boolean },
) {
    const { narrow, className, ...rest } = props;
    return (
        <RadixAlertDialog.Content
            aria-describedby={undefined}
            className={clsx(className, styles.content, {
                [styles.narrow]: narrow,
            })}
            {...rest}
        />
    );
}

function AlertTitle(
    props: RadixAlertDialog.AlertDialogTitleProps &
        React.RefAttributes<HTMLDivElement>,
) {
    return <RadixAlertDialog.Title {...props} />;
}

function AlertFooter({ children }: { children: React.ReactNode }) {
    return <div className={styles.footer}>{children}</div>;
}

function AlertClose(
    props: RadixAlertDialog.AlertDialogCancelProps &
        React.RefAttributes<HTMLButtonElement>,
) {
    return <RadixAlertDialog.Cancel {...props} />;
}

function AlertAction(
    props: RadixAlertDialog.AlertDialogActionProps &
        React.RefAttributes<HTMLButtonElement>,
) {
    return <RadixAlertDialog.Action {...props} />;
}

export function AlertDialog({
    open,
    onOpenChange,
    title,
    wide,
    className,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean, ok?: boolean) => void;
    title: string;
    wide?: boolean;
    className?: string;
    children: React.ReactNode;
}) {
    const myOnOpenChange = useCallback(
        (open: boolean) => {
            if (!open) {
                onOpenChange(open, false);
            } else {
                onOpenChange(open, undefined);
            }
        },
        [onOpenChange],
    );

    const onConfirm = useCallback(() => {
        onOpenChange(open, true);
    }, [onOpenChange, open]);

    const id = useId();

    return (
        <AlertRoot open={open} onOpenChange={myOnOpenChange}>
            <AlertPortal>
                <AlertOverlay />
                <AlertContent aria-describedby={id} narrow={!wide}>
                    <form
                        onSubmit={(event) => {
                            onConfirm();
                            event.preventDefault();
                        }}
                    >
                        <AlertTitle>{title}</AlertTitle>
                        <div id={id} className={className}>
                            {children}
                        </div>
                        <AlertFooter>
                            <AlertAction
                                className="tracker-button"
                                type="submit"
                            >
                                Confirm
                            </AlertAction>
                            <AlertClose className="tracker-button tracker-button-secondary">
                                Close
                            </AlertClose>
                        </AlertFooter>
                    </form>
                </AlertContent>
            </AlertPortal>
        </AlertRoot>
    );
}
