/**
 * Import Chat Message - Renders messages in import session chat
 * References:
 * - specs/005-create-the-ai/plan.md T051
 */

import React from 'react';
import { User, Bot, AlertCircle } from 'lucide-react';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  metadata?: {
    entities_extracted?: number;
    nodes_created?: number;
    edges_created?: number;
    cards_created?: number;
  };
}

interface ImportChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function ImportChatMessage({ message, isStreaming = false }: ImportChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isSystem ? 'bg-yellow-100' : 'bg-blue-100'
        }`}>
          {isSystem ? (
            <AlertCircle className="w-4 h-4 text-yellow-600" />
          ) : (
            <Bot className="w-4 h-4 text-blue-600" />
          )}
        </div>
      )}

      <div
        className={`max-w-[70%] px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-blue-500 text-white'
            : isSystem
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-gray-100'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && <span className="animate-pulse ml-1">▋</span>}
        </div>

        {/* Show metadata if available */}
        {message.metadata && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs opacity-70">
            {message.metadata.entities_extracted !== undefined && (
              <div>Entities extracted: {message.metadata.entities_extracted}</div>
            )}
            {message.metadata.nodes_created !== undefined && (
              <div>Nodes created: {message.metadata.nodes_created}</div>
            )}
            {message.metadata.edges_created !== undefined && (
              <div>Edges created: {message.metadata.edges_created}</div>
            )}
            {message.metadata.cards_created !== undefined && (
              <div>Cards created: {message.metadata.cards_created}</div>
            )}
          </div>
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <User className="w-4 h-4 text-green-600" />
        </div>
      )}
    </div>
  );
}