import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    busy?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    danger,
    busy = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog.Root open={open} onOpenChange={(v) => !v && !busy && onCancel()}>
            <Dialog.Portal>
                <Dialog.Overlay className="confirm-overlay" />
                <Dialog.Content
                    className="confirm-content"
                    onEscapeKeyDown={(event) => busy && event.preventDefault()}
                    onPointerDownOutside={(event) => busy && event.preventDefault()}
                >
                    <Dialog.Title className="confirm-title">{title}</Dialog.Title>
                    <Dialog.Description className="confirm-description">
                        {description}
                    </Dialog.Description>
                    <div className="confirm-actions">
                        <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>
                            {cancelLabel ?? t('common.cancel', { defaultValue: 'Cancel' })}
                        </button>
                        <button
                            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                            onClick={onConfirm}
                            disabled={busy}
                        >
                            {busy && <span className="spinner spinner-xs" aria-hidden="true" />}
                            {confirmLabel ?? t('common.confirm', { defaultValue: 'Confirm' })}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
