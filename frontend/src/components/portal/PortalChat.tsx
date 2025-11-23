/**
 * PortalChat Component
 * Feature 009: Player Question Portal
 * T038: Chat interface with messages, citations display, scroll to bottom
 */

import React, { useState, useEffect, useRef } from 'react';
import { CitationLink } from './CitationLink';
import axios from 'axios';

interface Citation {
  number: number;
  cardId: string;
  cardTitle: string;
  url: string;
}

interface Message {
  id: string;
  question: string;
  response: string;
  citations: Citation[];
  createdAt: number;
}

interface PortalChatProps {
  campaignId: string;
}

export const PortalChat: React.FC<PortalChatProps> = ({ campaignId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, [campaignId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const loadHistory = async () => {
    try {
      const response = await axios.get(`/api/portal/${campaignId}/history`);
      setMessages(response.data.messages.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`/api/portal/${campaignId}/ask`, {
        question: question.trim(),
      });

      // Add new message to list
      setMessages([...messages, response.data]);
      setQuestion('');
    } catch (error: any) {
      if (error.response?.status === 503) {
        setError('Portal is not configured. Please contact your GM.');
      } else {
        setError('Failed to send question. Please try again.');
      }
      console.error('Error asking question:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      <h2>Campaign Portal</h2>

      {/* Messages Display */}
      <div
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          minHeight: '400px',
          maxHeight: '600px',
          overflowY: 'auto',
          marginBottom: '1.5rem',
          background: '#fafafa',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            <p>No questions yet. Ask something about the campaign!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: '2rem' }}>
              {/* Question */}
              <div
                style={{
                  padding: '1rem',
                  background: '#e3f2fd',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                }}
              >
                <strong>You:</strong> {msg.question}
              </div>

              {/* Response */}
              <div
                style={{
                  padding: '1rem',
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: '1rem' }}>
                  {msg.response}
                </div>

                {/* Citations */}
                {msg.citations.length > 0 && (
                  <div
                    style={{
                      borderTop: '1px solid #e0e0e0',
                      paddingTop: '0.75rem',
                      marginTop: '0.75rem',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                      Sources:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {msg.citations.map((citation) => (
                        <CitationLink key={citation.number} citation={citation} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Question Input */}
      <form onSubmit={handleSubmit}>
        {error && (
          <div
            style={{
              padding: '1rem',
              background: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: '4px',
              marginBottom: '1rem',
              color: '#c62828',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the campaign..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              background: loading || !question.trim() ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Sending...' : 'Ask'}
          </button>
        </div>
      </form>
    </div>
  );
};
