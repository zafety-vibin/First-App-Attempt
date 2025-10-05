/**
 * AI Sidebar - Claude-for-Chrome-style sidebar for Import/Planning AI
 * Slides in from right, pushes content left
 * Feature: 005-create-the-ai
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Brain, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BYOLLMSettings } from './BYOLLMSettings';

interface Message {
  role: 'user' | 'assistant' | 'debug';
  content: string;
  timestamp: number;
  debugType?: 'tool_call' | 'tool_result' | 'tool_error';
  debugTool?: string;
  debugData?: any;
}

interface AISidebarProps {
  type: 'import' | 'planning';
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AISidebar({ type, campaignId, isOpen, onClose }: AISidebarProps) {
  const navigate = useNavigate();
  const [hasBYOLLMConfig, setHasBYOLLMConfig] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check BYOLLM configuration on mount
  useEffect(() => {
    checkBYOLLMConfig();
  }, [campaignId]);

  const checkBYOLLMConfig = async () => {
    try {
      // TODO: Call backend to check if campaign has BYOLLM config
      // For now, simulate check
      const response = await fetch(`http://localhost:3001/api/byollm/config?campaignId=${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // If we got a config object back, it's configured
        setHasBYOLLMConfig(!!data && !!data.id);
      } else {
        setHasBYOLLMConfig(false);
      }
    } catch (error) {
      console.error('BYOLLM config check failed:', error);
      setHasBYOLLMConfig(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create session on mount if configured
  useEffect(() => {
    if (hasBYOLLMConfig && !sessionId) {
      createSession();
    }
  }, [hasBYOLLMConfig]);

  const createSession = async () => {
    try {
      const endpoint = type === 'import' ? '/api/import/session' : '/api/planning/session';
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({ campaignId })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.id);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionId || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const endpoint = type === 'import' ? '/api/import/chat' : '/api/planning/chat';
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          sessionId,
          campaignId,
          message: inputValue
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);

                // Handle card_changed events for real-time updates
                if (parsed.type === 'card_changed') {
                  console.log('[AISidebar] Card changed event received:', parsed);
                  window.dispatchEvent(new CustomEvent('cardChanged', {
                    detail: { campaignId: parsed.campaignId, operation: parsed.operation }
                  }));
                }

                // Handle debug messages
                if (parsed.debug) {
                  setMessages(prev => [...prev, {
                    role: 'debug',
                    content: '',
                    timestamp: Date.now(),
                    debugType: parsed.type,
                    debugTool: parsed.tool,
                    debugData: parsed.params || parsed.result || parsed.error
                  }]);
                }

                // Handle error messages from backend
                if (parsed.error) {
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Error: ${parsed.error}`,
                    timestamp: Date.now()
                  }]);
                }

                // Handle content deltas
                if (parsed.delta) {
                  assistantMessage += parsed.delta;
                  // Update the last message in real-time
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content = assistantMessage;
                    } else {
                      newMessages.push({
                        role: 'assistant',
                        content: assistantMessage,
                        timestamp: Date.now()
                      });
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your message.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const icon = type === 'import' ? <FileText className="w-5 h-5" /> : <Brain className="w-5 h-5" />;
  const title = type === 'import' ? 'Import AI' : 'Planning AI';

  return (
    <>
      {/* Overlay to darken main content when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '400px',
          backgroundColor: '#ffffff',
          boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.1)',
          zIndex: 50,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Powered by Claude</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {hasBYOLLMConfig === null && (
            <div className="flex items-center justify-center flex-1">
              <p className="text-gray-500">Checking configuration...</p>
            </div>
          )}

          {hasBYOLLMConfig === false && (
            <div className="p-6 overflow-y-auto">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 mb-3">
                  Configure your LLM credentials to use {title}
                </p>
                <button
                  onClick={() => navigate(`/campaigns/${campaignId}/settings`)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  Go to Settings
                </button>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-3">Quick Setup</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configure your credentials here:
                </p>
                <BYOLLMSettings campaignId={campaignId} scope="campaign" />
              </div>
            </div>
          )}

          {hasBYOLLMConfig === true && (
            <>
              {/* Messages Area - Scrollable */}
              <div className="flex-1 overflow-y-scroll overflow-x-hidden px-6 py-4" style={{ minHeight: 0, maxHeight: '100%' }}>
                {messages.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center mt-8">
                    {type === 'import'
                      ? 'Upload a file or describe what you want to import into your campaign.'
                      : 'Ask me to help plan your next session or manage your knowledge graphs.'
                    }
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message, index) => {
                      if (message.role === 'debug') {
                        const debugIcon = message.debugType === 'tool_call' ? '⚙️' :
                                         message.debugType === 'tool_result' ? '✅' : '❌';
                        const debugColor = message.debugType === 'tool_call' ? 'bg-blue-50 border-blue-200' :
                                          message.debugType === 'tool_result' ? 'bg-green-50 border-green-200' :
                                          'bg-red-50 border-red-200';

                        return (
                          <div key={index} className="flex justify-center">
                            <div className={`max-w-[95%] rounded-lg px-3 py-2 border ${debugColor}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs">{debugIcon}</span>
                                <span className="text-xs font-semibold text-gray-700">
                                  {message.debugType === 'tool_call' ? 'Tool Call' :
                                   message.debugType === 'tool_result' ? 'Tool Result' : 'Tool Error'}
                                </span>
                                <span className="text-xs text-gray-600">→ {message.debugTool}</span>
                              </div>
                              <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words">
                                {JSON.stringify(message.debugData, null, 2)}
                              </pre>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={index}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                              message.role === 'user'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input - Fixed at Bottom */}
              <div className="border-t border-gray-200 p-4 bg-white" style={{ flexShrink: 0 }}>
                <div className="flex gap-2 items-end">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!isLoading && sessionId && inputValue.trim()) {
                          handleSendMessage();
                        }
                      }
                    }}
                    placeholder={type === 'import' ? 'Describe what to import...' : 'Ask me anything...'}
                    disabled={isLoading || !sessionId}
                    rows={1}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed resize-none overflow-hidden"
                    style={{
                      minHeight: '40px',
                      maxHeight: '200px',
                      height: 'auto'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !sessionId || !inputValue.trim()}
                    className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
