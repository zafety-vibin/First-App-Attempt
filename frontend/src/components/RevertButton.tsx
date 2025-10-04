/**
 * Revert Button - Batch revert for approved import sessions
 * References:
 * - specs/005-create-the-ai/plan.md T053
 * - specs/005-create-the-ai/research.md lines 312-340
 */

import React, { useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface RevertButtonProps {
  sessionId: string;
  onRevert: () => Promise<void>;
}

export function RevertButton({ sessionId, onRevert }: RevertButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  const handleRevert = async () => {
    setIsReverting(true);
    try {
      await onRevert();
      setIsConfirmOpen(false);
    } catch (error) {
      console.error('Revert failed:', error);
      alert('Failed to revert changes. Please try again.');
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsConfirmOpen(true)}
        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        Revert Import
      </button>

      <Dialog.Root open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 max-w-md w-full z-50">
            <Dialog.Title className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Revert
            </Dialog.Title>

            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                This will permanently delete all changes from this import session:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>All created cards will be deleted</li>
                <li>All knowledge graph nodes will be removed</li>
                <li>All knowledge graph edges will be removed</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Only changes from this specific import session will be reverted.
                Other campaign data will remain unchanged.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Dialog.Close asChild>
                <button
                  disabled={isReverting}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleRevert}
                disabled={isReverting}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isReverting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Reverting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Revert All Changes
                  </>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}