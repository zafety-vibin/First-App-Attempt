/**
 * Import Session Hook - State management for import sessions
 * References:
 * - specs/005-create-the-ai/plan.md T056
 * - specs/005-create-the-ai/research.md lines 360-411
 */

import { useState, useCallback, useEffect } from 'react';
import { importService, ImportSession, ImportBatch } from '../services/importService';
import type { ChatMessage } from '../components/ImportChatMessage';
import type { ApprovalSummaryData } from '../components/ApprovalSummary';

interface UseImportSessionReturn {
  sessionId: string | null;
  session: ImportSession | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  approvalSummary: ApprovalSummaryData | null;
  hasApproved: boolean;
  error: string | null;
  createSession: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  approve: () => Promise<void>;
  revert: () => Promise<void>;
  reset: () => void;
}

export function useImportSession(campaignId: string): UseImportSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<ImportSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [approvalSummary, setApprovalSummary] = useState<ApprovalSummaryData | null>(null);
  const [hasApproved, setHasApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  // Create a new import session
  const createSession = useCallback(async () => {
    try {
      setError(null);
      const newSession = await importService.createSession(campaignId);
      setSessionId(newSession.id);
      setSession(newSession);
      setMessages([
        {
          role: 'system',
          content: 'Import session created. Upload a file to begin extracting entities.',
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      setError('Failed to create import session');
      console.error('Create session error:', err);
    }
  }, [campaignId]);

  // Upload a file
  const uploadFile = useCallback(async (file: File) => {
    if (!sessionId) {
      setError('No active session');
      return;
    }

    try {
      setError(null);

      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: `Uploading file: ${file.name}`,
          timestamp: Date.now(),
        },
      ]);

      const result = await importService.uploadFile(campaignId, sessionId, file);

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.message,
          timestamp: Date.now(),
          metadata: {
            entities_extracted: result.entities_extracted,
          },
        },
      ]);

      // Fetch approval summary after file upload
      const summary = await importService.getApprovalSummary(campaignId, sessionId);
      setApprovalSummary(summary);
    } catch (err) {
      setError('Failed to upload file');
      console.error('Upload error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: 'File upload failed. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    }
  }, [campaignId, sessionId]);

  // Send a chat message
  const sendMessage = useCallback(async (message: string) => {
    if (!sessionId) {
      setError('No active session');
      return;
    }

    try {
      setError(null);
      setIsStreaming(true);

      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: message,
          timestamp: Date.now(),
        },
      ]);

      // Add empty assistant message for streaming
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        },
      ]);

      // Stream the response
      await importService.sendMessage(
        campaignId,
        sessionId,
        message,
        (chunk) => {
          // Append chunk to the last message
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content += chunk;
            }
            return updated;
          });
        }
      );

      // After streaming completes, fetch updated approval summary
      const summary = await importService.getApprovalSummary(campaignId, sessionId);
      setApprovalSummary(summary);
    } catch (err) {
      setError('Failed to send message');
      console.error('Send message error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: 'Failed to send message. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [campaignId, sessionId]);

  // Approve the import session
  const approve = useCallback(async () => {
    if (!sessionId || !approvalSummary) {
      setError('No session or summary to approve');
      return;
    }

    try {
      setError(null);
      const batch = await importService.approve(campaignId, sessionId);
      setBatchId(batch.id);
      setHasApproved(true);

      // Update session status
      if (session) {
        setSession({
          ...session,
          status: 'approved',
          import_batch_id: batch.id,
        });
      }

      // Add success message
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: `Import approved! Created ${batch.cards_created} cards, ${batch.nodes_added} nodes, and ${batch.edges_added} edges.`,
          timestamp: Date.now(),
          metadata: {
            cards_created: batch.cards_created,
            nodes_created: batch.nodes_added,
            edges_created: batch.edges_added,
          },
        },
      ]);

      // Clear approval summary
      setApprovalSummary(null);
    } catch (err) {
      setError('Failed to approve import');
      console.error('Approve error:', err);
    }
  }, [campaignId, sessionId, approvalSummary, session]);

  // Revert the import batch
  const revert = useCallback(async () => {
    if (!batchId) {
      setError('No batch to revert');
      return;
    }

    try {
      setError(null);
      const result = await importService.revertBatch(campaignId, batchId);

      // Add revert message
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: result.message,
          timestamp: Date.now(),
        },
      ]);

      // Reset state after revert
      setHasApproved(false);
      setBatchId(null);
      setSessionId(null);
      setSession(null);
    } catch (err) {
      setError('Failed to revert batch');
      console.error('Revert error:', err);
    }
  }, [campaignId, batchId]);

  // Reset the session state
  const reset = useCallback(() => {
    setSessionId(null);
    setSession(null);
    setMessages([]);
    setIsStreaming(false);
    setApprovalSummary(null);
    setHasApproved(false);
    setError(null);
    setBatchId(null);
  }, []);

  // Load chat history if session already exists
  useEffect(() => {
    if (sessionId && messages.length <= 1) {
      importService.getChatHistory(campaignId, sessionId)
        .then((history) => {
          if (history.length > 0) {
            setMessages(history);
          }
        })
        .catch((err) => {
          console.error('Failed to load chat history:', err);
        });
    }
  }, [campaignId, sessionId, messages.length]);

  return {
    sessionId,
    session,
    messages,
    isStreaming,
    approvalSummary,
    hasApproved,
    error,
    createSession,
    uploadFile,
    sendMessage,
    approve,
    revert,
    reset,
  };
}