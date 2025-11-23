/**
 * PortalManagementPage
 * Feature 009: Player Question Portal
 * T029: Main GM portal management page with tabs (Settings, Monitoring, Preview)
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PortalSettings } from '../components/portal/PortalSettings';
import { PortalMonitoring } from '../components/portal/PortalMonitoring';
import { DMPreviewMode } from '../components/portal/DMPreviewMode';

type TabType = 'settings' | 'monitoring' | 'preview';

export const PortalManagementPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('settings');

  if (!campaignId) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Error: Campaign ID not found</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Player Portal Management</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Configure and monitor your campaign's player question portal
      </p>

      {/* Tab Navigation */}
      <div
        style={{
          borderBottom: '2px solid #e0e0e0',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
        }}
      >
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'settings' ? '3px solid #2196F3' : 'none',
            color: activeTab === 'settings' ? '#2196F3' : '#666',
            fontWeight: activeTab === 'settings' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('monitoring')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'monitoring' ? '3px solid #2196F3' : 'none',
            color: activeTab === 'monitoring' ? '#2196F3' : '#666',
            fontWeight: activeTab === 'monitoring' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Monitoring
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'preview' ? '3px solid #2196F3' : 'none',
            color: activeTab === 'preview' ? '#2196F3' : '#666',
            fontWeight: activeTab === 'preview' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Preview
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'settings' && <PortalSettings campaignId={campaignId} />}
        {activeTab === 'monitoring' && <PortalMonitoring campaignId={campaignId} />}
        {activeTab === 'preview' && <DMPreviewMode campaignId={campaignId} />}
      </div>
    </div>
  );
};
