/**
 * Import Tab - Pull-down overlay with Radix UI Dialog
 * References:
 * - specs/005-create-the-ai/research.md lines 469-651
 * - specs/005-create-the-ai/plan.md T050
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Upload, Send, FileText, X } from 'lucide-react';
import { ImportChatMessage } from './ImportChatMessage';
import { ApprovalSummary } from './ApprovalSummary';
import { RevertButton } from './RevertButton';
import { useImportSession } from '../hooks/useImportSession';
import { useAITab } from '../contexts/AITabContext';

interface ImportTabProps {
  campaignId: string;
}

export function ImportTab({ campaignId }: ImportTabProps) {
  const { activeTab, closeTab } = useAITab();
  const isOpen = activeTab === 'import';

  const {
    sessionId,
    messages,
    isStreaming,
    approvalSummary,
    hasApproved,
    createSession,
    uploadFile,
    sendMessage,
    approve,
    revert,
  } = useImportSession(campaignId);

  const [inputMessage, setInputMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session when tab opens
  useEffect(() => {
    if (isOpen && !sessionId) {
      createSession();
    }
  }, [isOpen, sessionId, createSession]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['.pdf', '.docx', '.txt', '.md'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!allowedTypes.includes(fileExt)) {
        alert('Please select a PDF, DOCX, TXT, or MD file');
        return;
      }

      setSelectedFile(file);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !sessionId) return;

    try {
      await uploadFile(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('File upload failed. Please try again.');
    }
  }, [selectedFile, sessionId, uploadFile]);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !sessionId || isStreaming) return;

    const message = inputMessage.trim();
    setInputMessage('');
    await sendMessage(message);
  }, [inputMessage, sessionId, isStreaming, sendMessage]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeTab()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-0 left-0 right-0 h-[80vh] bg-white rounded-b-lg shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Import AI
            </h2>
            <Dialog.Close asChild>
              <button
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Show approval summary if available */}
            {approvalSummary && !hasApproved && (
              <ApprovalSummary
                summary={approvalSummary}
                onApprove={approve}
                onReject={() => {
                  // Clear approval summary on rejection
                  // This would typically clear it from state
                }}
              />
            )}

            {/* Show revert button if session was approved */}
            {hasApproved && sessionId && (
              <div className="mb-4">
                <RevertButton
                  sessionId={sessionId}
                  onRevert={revert}
                />
              </div>
            )}

            {/* Chat Messages */}
            <div className="space-y-4">
              {messages.map((message, index) => (
                <ImportChatMessage
                  key={index}
                  message={message}
                  isStreaming={isStreaming && index === messages.length - 1}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t px-6 py-4">
            {/* File Upload */}
            {!hasApproved && (
              <div className="mb-4 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md cursor-pointer transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Choose File
                </label>
                {selectedFile && (
                  <>
                    <span className="text-sm text-gray-600">{selectedFile.name}</span>
                    <button
                      onClick={handleUpload}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Upload
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Chat Input */}
            <div className="flex gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={hasApproved ? "Session approved. Start a new session to import more content." : "Ask about the uploaded content or provide additional context..."}
                disabled={isStreaming || hasApproved}
                className="flex-1 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isStreaming || hasApproved}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}