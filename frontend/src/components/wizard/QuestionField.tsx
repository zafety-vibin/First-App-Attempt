/**
 * Question Field
 * Feature: 016-create-a-campaign
 * T024: Question input component
 */

import React from 'react';
import { WorldFoundationsQuestion } from '../../constants/themes';

interface QuestionFieldProps {
  question: WorldFoundationsQuestion;
  value: string;
  onChange: (value: string) => void;
}

export default function QuestionField({ question, value, onChange }: QuestionFieldProps) {
  const charCount = value.length;
  const isOverLimit = charCount > 1000;

  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#e2e8f0',
        marginBottom: '0.5rem'
      }}>
        {question.question}
        {!question.required && (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}> (optional)</span>
        )}
      </label>

      {question.input_type === 'multiple_choice' && question.options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.875rem'
          }}
        >
          <option value="">Select...</option>
          {question.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : question.input_type === 'long_text' ? (
        <>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${isOverLimit ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.875rem',
              resize: 'vertical'
            }}
          />
          <div style={{
            fontSize: '0.688rem',
            color: isOverLimit ? '#ef4444' : '#6b7280',
            marginTop: '0.25rem',
            textAlign: 'right'
          }}>
            {charCount}/1000 characters
          </div>
        </>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.875rem'
          }}
        />
      )}
    </div>
  );
}
