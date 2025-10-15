/**
 * Feature 006: Campaign-Story Graph Page
 * Timeline of events with time-based decay
 * Confidence decays with in-game time from session_recaps
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft } from 'lucide-react';

const CampaignStoryPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  return (
    <div className="graph-page campaign-story-page">
      <header className="graph-page-header">
        <button
          className="back-button"
          onClick={() => navigate(`/campaigns/${campaignId}/graphs`)}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Graphs
        </button>
        <div className="header-content">
          <Clock className="w-8 h-8" />
          <div>
            <h1>Campaign Story</h1>
            <p className="subtitle">Events over time with confidence decay</p>
          </div>
        </div>
      </header>

      <div className="graph-placeholder">
        <p>Timeline visualization coming soon...</p>
        <p className="graph-note">
          Confidence decays based on in-game time passage
          <br />
          Tracked from session_recaps (time_passed, in_game_date_start/end)
          <br />
          Pin important events to prevent decay
        </p>
      </div>
    </div>
  );
};

export { CampaignStoryPage };
export default CampaignStoryPage;
