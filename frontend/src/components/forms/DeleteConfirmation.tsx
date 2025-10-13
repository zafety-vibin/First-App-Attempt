import React from 'react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import './DeleteConfirmation.css';

export interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entityName: string;
  entityType: string;
  loading?: boolean;
}

/**
 * Delete confirmation modal with danger styling
 * Uses ConfirmDialog with custom message formatting
 *
 * Usage:
 * <DeleteConfirmation
 *   isOpen={showDelete}
 *   onClose={handleClose}
 *   onConfirm={handleDelete}
 *   entityName="John the Brave"
 *   entityType="NPC"
 *   loading={isDeleting}
 * />
 */
export const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  entityName,
  entityType,
  loading = false,
}) => {
  const handleConfirm = async () => {
    if (!loading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  const message = `Are you sure you want to delete ${entityType} "${entityName}"? This action cannot be undone.`;

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !loading) {
          onClose();
        }
      }}
      title="Delete Confirmation"
      message={message}
      confirmLabel={loading ? 'Deleting...' : 'Delete'}
      cancelLabel="Cancel"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      variant="danger"
    />
  );
};
