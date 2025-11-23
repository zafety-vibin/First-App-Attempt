/**
 * PlayerPortalPage
 * Feature 009: Player Question Portal
 * T036: Public player Q&A interface (NO authentication required)
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlayerIdentity } from '../components/portal/PlayerIdentity';
import { PasswordEntry } from '../components/portal/PasswordEntry';
import { PortalChat } from '../components/portal/PortalChat';
import { PortalWarning } from '../components/portal/PortalWarning';
import axios from 'axios';

interface PortalStatus {
  enabled: boolean;
  requiresPassword: boolean;
}

export const PlayerPortalPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [status, setStatus] = useState<PortalStatus | null>(null);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [playerIdentified, setPlayerIdentified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortalStatus();
    checkExistingSession();
  }, [campaignId]);

  const loadPortalStatus = async () => {
    try {
      const response = await axios.get(`/api/portal/${campaignId}/status`);
      setStatus(response.data);

      // If no password required, mark as verified
      if (!response.data.requiresPassword) {
        setPasswordVerified(true);
      }
    } catch (error) {
      console.error('Error loading portal status:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingSession = () => {
    // Check if player already has a session (cookie exists)
    // This would be done by trying to load history
    // For now, assume no existing session
    setPlayerIdentified(false);
  };

  const handlePasswordVerified = () => {
    setPasswordVerified(true);
  };

  const handlePlayerIdentified = () => {
    setPlayerIdentified(true);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading portal...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Portal Not Found</h2>
        <p>This campaign's portal does not exist or is not accessible.</p>
      </div>
    );
  }

  if (!status.enabled) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Portal Disabled</h2>
        <p>This campaign's player portal is currently disabled by the GM.</p>
      </div>
    );
  }

  // Show password entry if required and not yet verified
  if (status.requiresPassword && !passwordVerified) {
    return <PasswordEntry campaignId={campaignId!} onVerified={handlePasswordVerified} />;
  }

  // Show player identity if not yet identified
  if (!playerIdentified) {
    return (
      <div>
        <PortalWarning />
        <PlayerIdentity campaignId={campaignId!} onIdentified={handlePlayerIdentified} />
      </div>
    );
  }

  // Show chat interface
  return (
    <div>
      <PortalWarning />
      <PortalChat campaignId={campaignId!} />
    </div>
  );
};
