/**
 * Step 4: World-Foundations Questionnaire
 * Feature: 016-create-a-campaign
 * T021: World constants questionnaire
 */

import React from 'react';
import { useWizard } from '../../contexts/WizardContext';
import { WORLD_FOUNDATIONS_QUESTIONS } from '../../constants/themes';
import QuestionField from './QuestionField';

export default function Step4WorldFoundations() {
  const { state, dispatch } = useWizard();

  const handleAnswerChange = (questionId: number, answer: string) => {
    dispatch({ type: 'SET_ANSWER', payload: { questionId, answer } });
  };

  const answeredCount = state.step4.answers.size;

  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>
        World Foundations
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
        Answer these questions to create initial world rules. All questions are optional.
      </p>

      <div style={{
        background: 'rgba(168, 85, 247, 0.1)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem'
      }}>
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#a855f7' }}>
          {answeredCount} world rule{answeredCount !== 1 ? 's' : ''} will be created
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {WORLD_FOUNDATIONS_QUESTIONS.map(question => (
          <QuestionField
            key={question.id}
            question={question}
            value={state.step4.answers.get(question.id) || ''}
            onChange={(value) => handleAnswerChange(question.id, value)}
          />
        ))}
      </div>
    </div>
  );
}
