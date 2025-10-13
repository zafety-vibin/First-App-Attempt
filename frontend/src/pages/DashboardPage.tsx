import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { useViewMode } from '../contexts/ViewModeContext';
import { NPCLandingCard } from '../components/dashboard/NPCLandingCard';
import { LocationLandingCard } from '../components/dashboard/LocationLandingCard';
import { QuestLandingCard } from '../components/dashboard/QuestLandingCard';
import { SessionTimelineCard } from '../components/dashboard/SessionTimelineCard';
import './DashboardPage.css';

export interface DashboardPageProps {
  campaignId?: string;
}

/**
 * T057: Campaign Dashboard Page
 * Shows landing card widgets in responsive grid layout
 * 2-column on tablet, 3-column on desktop
 */
export const DashboardPage: React.FC<DashboardPageProps> = ({ campaignId: propCampaignId }) => {
  const params = useParams<{ campaignId: string }>();
  const campaignId = propCampaignId || params.campaignId || '';
  const { viewMode, toggleViewMode } = useViewMode();
  const { refresh } = useDashboard();

  useEffect(() => {
    // Refresh dashboard data on mount
    refresh();
  }, [refresh]);

  if (!campaignId) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <p>Error: Campaign ID not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Campaign Dashboard</h1>
        <button
          type="button"
          className="view-mode-toggle"
          onClick={toggleViewMode}
          aria-label="Toggle View Mode"
        >
          View Mode: {viewMode === 'dm' ? 'DM View' : 'Player View'}
        </button>
      </header>

      <div className="dashboard-grid">
        <NPCLandingCard campaignId={campaignId} />
        <LocationLandingCard campaignId={campaignId} />
        <QuestLandingCard campaignId={campaignId} />
        <SessionTimelineCard campaignId={campaignId} />
      </div>
    </div>
  );
};
