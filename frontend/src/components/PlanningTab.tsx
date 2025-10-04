/**
 * Planning Tab - Pull-down overlay for planning AI
 * References:
 * - specs/005-create-the-ai/research.md lines 652-758
 * - specs/005-create-the-ai/plan.md T057
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Brain, Send, X, GitBranch } from 'lucide-react';
import { PlanningChatMessage } from './PlanningChatMessage';
import { GraphViewer } from './GraphViewer';
import { usePlanningSession } from '../hooks/usePlanningSession';
import { useAITab } from '../contexts/AITabContext';

interface PlanningTabProps {
  campaignId: string;
}

export function PlanningTab({ campaignId }: PlanningTabProps) {
  const { activeTab, closeTab } = useAITab();
  const isOpen = activeTab === 'planning';

  const {
    sessionId,
    messages,
    isStreaming,
    graphUpdates,
    createSession,
    sendMessage,
    completeSession,
  } = usePlanningSession(campaignId);

  const [inputMessage, setInputMessage] = useState('');
  const [showGraphViewer, setShowGraphViewer] = useState(false);
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

  const handleComplete = useCallback(async () => {
    if (!sessionId) return;
    await completeSession();
    closeTab();
  }, [sessionId, completeSession, closeTab]);

  // Count total graph updates
  const totalUpdates = Object.values(graphUpdates).reduce(
    (sum, update) => sum + update.nodes_added + update.edges_added,
    0
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeTab()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-0 left-0 right-0 h-[80vh] bg-white rounded-b-lg shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Planning AI
            </h2>
            <div className="flex items-center gap-4">
              {totalUpdates > 0 && (
                <button
                  onClick={() => setShowGraphViewer(!showGraphViewer)}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors flex items-center gap-2 text-sm"
                >
                  <GitBranch className="w-4 h-4" />
                  {totalUpdates} Graph Updates
                </button>
              )}
              <Dialog.Close asChild>
                <button
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${showGraphViewer ? 'border-r' : ''}`}>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <PlanningChatMessage
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
                <div className="flex gap-2">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about campaign planning, world-building, or story development..."
                    disabled={isStreaming}
                    className="flex-1 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                    rows={2}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isStreaming}
                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>

                {/* Complete Session Button */}
                {messages.length > 1 && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={handleComplete}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                    >
                      Complete Planning Session
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Graph Viewer Sidebar */}
            {showGraphViewer && (
              <div className="w-96 overflow-y-auto">
                <GraphViewer
                  campaignId={campaignId}
                  updates={graphUpdates}
                />
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}