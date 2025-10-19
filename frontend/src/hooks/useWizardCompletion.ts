/**
 * useWizardCompletion Hook
 * Feature: 016-create-a-campaign
 * T026: Submit wizard data to backend
 */

import { useState } from 'react';
import { apiClient } from '../services/apiClient';
import { ThemeOption, CategoryLabelsMap } from '../constants/themes';

interface WizardCompleteRequest {
  theme: ThemeOption;
  categoryLabels: CategoryLabelsMap;
  enabledCategories: string[];
  worldFoundationsAnswers?: Array<{ questionId: number; answer: string }>;
}

export function useWizardCompletion() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const completeWizard = async (campaignId: string, wizardData: WizardCompleteRequest) => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await apiClient.post(
        `/campaigns/${campaignId}/wizard/complete`,
        wizardData
      );

      return response.data;
    } catch (err: any) {
      console.error('Failed to complete wizard:', err);
      setError(err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return { completeWizard, submitting, error };
}
