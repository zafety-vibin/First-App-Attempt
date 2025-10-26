/**
 * useWizardStatus Hook
 * Feature: 016-create-a-campaign
 * T025: Fetch wizard status on campaign load
 */

import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { CampaignSettings } from '../constants/themes';

interface WizardStatusResponse {
  shouldShowWizard: boolean;
  existingSettings: CampaignSettings | null;
}

export function useWizardStatus(campaignId: string) {
  const [status, setStatus] = useState<WizardStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get(`/campaigns/${campaignId}/wizard/status`);
        setStatus(response.data);
      } catch (err: any) {
        console.error('Failed to fetch wizard status:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetchStatus();
    }
  }, [campaignId]);

  return { status, loading, error };
}
