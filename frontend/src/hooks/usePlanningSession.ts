/**
 * Planning Session Hook - State management for planning sessions
 * References:
 * - specs/005-create-the-ai/plan.md T061
 */

import { useState, useCallback, useEffect } from 'react';
import { planningService, PlanningSession, GraphUpdateSummary } from '../services/planningService';
import type { ChatMessage } from '../components/ImportChatMessage';

interface UsePlanningSessionReturn {
  sessionId: string | null;
  session: PlanningSession | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  graphUpdates: Record<string, GraphUpdateSummary>;
  error: string | null;
  createSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  completeSession: () => Promise<void>;
  reset: () => void;
}

export function usePlanningSession(campaignId: string): UsePlanningSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<PlanningSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [graphUpdates, setGraphUpdates] = useState<Record<string, GraphUpdateSummary>>({});
  const [error, setError] = useState<string | null>(null);

  // Create a new planning session
  const createSession = useCallback(async () => {
    try {
      setError(null);
      const newSession = await planningService.createSession(campaignId);
      setSessionId(newSession.id);
      setSession(newSession);
      setMessages([
        {
          role: 'system',
          content: 'Planning session created. Ask me about campaign planning, world-building, or story development. Knowledge graphs will update automatically as we discuss.',
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      setError('Failed to create planning session');
      console.error('Create session error:', err);
    }
  }, [campaignId]);

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
      const assistantMessageIndex = messages.length + 1;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        },
      ]);

      // Track graph updates for this message
      const messageGraphUpdates: GraphUpdateSummary[] = [];

      // Stream the response
      await planningService.sendMessage(
        campaignId,
        sessionId,
        message,
        (chunk) => {
          // Append chunk to the assistant message
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content += chunk;
            }
            return updated;
          });
        },
        (updates) => {
          // Handle graph updates
          messageGraphUpdates.push(...updates);

          // Update graph updates state
          updates.forEach((update) => {
            setGraphUpdates((prev) => {
              const existing = prev[update.graph_type] || {
                graph_type: update.graph_type,
                nodes_added: 0,
                edges_added: 0,
              };

              return {
                ...prev,
                [update.graph_type]: {
                  graph_type: update.graph_type,
                  nodes_added: existing.nodes_added + update.nodes_added,
                  edges_added: existing.edges_added + update.edges_added,
                },
              };
            });
          });
        }
      );

      // Add graph updates to the assistant message
      if (messageGraphUpdates.length > 0) {
        setMessages((prev) => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            (lastMessage as any).graphUpdates = messageGraphUpdates;
          }
          return updated;
        });
      }

      // Update session graph updates count
      if (session && messageGraphUpdates.length > 0) {
        const totalNewUpdates = messageGraphUpdates.reduce(
          (sum, update) => sum + update.nodes_added + update.edges_added,
          0
        );
        setSession({
          ...session,
          graph_updates_count: session.graph_updates_count + totalNewUpdates,
        });
      }
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
  }, [campaignId, sessionId, session, messages.length]);

  // Complete the planning session
  const completeSession = useCallback(async () => {
    if (!sessionId) {
      setError('No active session');
      return;
    }

    try {
      setError(null);
      const result = await planningService.completeSession(campaignId, sessionId);

      // Add completion message
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: result.message,
          timestamp: Date.now(),
        },
      ]);

      // Update session status
      if (session) {
        setSession({
          ...session,
          status: 'completed',
        });
      }
    } catch (err) {
      setError('Failed to complete session');
      console.error('Complete session error:', err);
    }
  }, [campaignId, sessionId, session]);

  // Reset the session state
  const reset = useCallback(() => {
    setSessionId(null);
    setSession(null);
    setMessages([]);
    setIsStreaming(false);
    setGraphUpdates({});
    setError(null);
  }, []);

  // Load chat history and graph updates if session already exists
  useEffect(() => {
    if (sessionId && messages.length <= 1) {
      // Load chat history
      planningService.getChatHistory(campaignId, sessionId)
        .then((history) => {
          if (history.length > 0) {
            setMessages(history);
          }
        })
        .catch((err) => {
          console.error('Failed to load chat history:', err);
        });

      // Load graph updates
      planningService.getGraphUpdates(campaignId, sessionId)
        .then((updates) => {
          const updateMap: Record<string, GraphUpdateSummary> = {};
          updates.forEach((update) => {
            if (!updateMap[update.graph_type]) {
              updateMap[update.graph_type] = {
                graph_type: update.graph_type,
                nodes_added: 0,
                edges_added: 0,
              };
            }
            updateMap[update.graph_type].nodes_added += update.nodes_added;
            updateMap[update.graph_type].edges_added += update.edges_added;
          });
          setGraphUpdates(updateMap);
        })
        .catch((err) => {
          console.error('Failed to load graph updates:', err);
        });
    }
  }, [campaignId, sessionId, messages.length]);

  return {
    sessionId,
    session,
    messages,
    isStreaming,
    graphUpdates,
    error,
    createSession,
    sendMessage,
    completeSession,
    reset,
  };
}