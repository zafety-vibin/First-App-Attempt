/**
 * Planning Chat Message - Renders messages in planning session with graph update indicators
 * References:
 * - specs/005-create-the-ai/plan.md T058
 */

import React from 'react';
import { User, Bot, GitBranch, Plus, Link2 } from 'lucide-react';
import type { ChatMessage } from './ImportChatMessage';

interface GraphUpdate {
  graph_type: string;
  nodes_added: number;
  edges_added: number;
}

interface PlanningChatMessageProps {
  message: ChatMessage & {
    graphUpdates?: GraphUpdate[];
  };
  isStreaming?: boolean;
}

export function PlanningChatMessage({ message, isStreaming = false }: PlanningChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isSystem ? 'bg-purple-100' : 'bg-purple-100'
        }`}>
          <Bot className="w-4 h-4 text-purple-600" />
        </div>
      )}

      <div className={`max-w-[70%] space-y-2`}>
        {/* Main message bubble */}
        <div
          className={`px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-purple-500 text-white'
              : isSystem
              ? 'bg-purple-50 border border-purple-200'
              : 'bg-gray-100'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
            {isStreaming && <span className="animate-pulse ml-1">▋</span>}
          </div>

          {/* Timestamp */}
          {message.timestamp && (
            <div className={`text-xs mt-1 ${isUser ? 'text-purple-100' : 'text-gray-500'}`}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Graph updates indicator */}
        {message.graphUpdates && message.graphUpdates.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-700 mb-2">
              <GitBranch className="w-4 h-4" />
              Knowledge Graph Updates
            </div>
            <div className="space-y-1 text-xs text-purple-600">
              {message.graphUpdates.map((update, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{update.graph_type}:</span>
                  <div className="flex items-center gap-3">
                    {update.nodes_added > 0 && (
                      <span className="flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        {update.nodes_added} nodes
                      </span>
                    )}
                    {update.edges_added > 0 && (
                      <span className="flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        {update.edges_added} edges
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata display */}
        {message.metadata && (
          <div className="bg-gray-50 rounded px-3 py-2 text-xs text-gray-600">
            {message.metadata.entities_extracted !== undefined && (
              <div>Entities identified: {message.metadata.entities_extracted}</div>
            )}
            {message.metadata.nodes_created !== undefined && (
              <div>Nodes created: {message.metadata.nodes_created}</div>
            )}
            {message.metadata.edges_created !== undefined && (
              <div>Edges created: {message.metadata.edges_created}</div>
            )}
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