import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

/**
 * Confirmation dialog component using Radix UI Dialog
 * Accessible modal with focus trap and keyboard navigation
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange?.(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange?.(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="confirm-dialog-overlay" />
        <Dialog.Content
          className="confirm-dialog-content"
          aria-describedby="confirm-dialog-message"
        >
          <Dialog.Title className="confirm-dialog-title">{title}</Dialog.Title>

          <Dialog.Description id="confirm-dialog-message" className="confirm-dialog-message">
            {message}
          </Dialog.Description>

          <div className="confirm-dialog-actions">
            <button
              type="button"
              className="confirm-dialog-button confirm-dialog-cancel"
              onClick={handleCancel}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`confirm-dialog-button confirm-dialog-confirm confirm-dialog-confirm-${variant}`}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className="confirm-dialog-close"
              aria-label="Close dialog"
              onClick={handleCancel}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
