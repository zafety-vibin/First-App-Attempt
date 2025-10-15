/**
 * Feature 006: World-Foundations Graph Page
 * Immutable truths about your world
 * NO confidence decay - these are permanent facts
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';

const WorldFoundationsPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  return (
    <div className="graph-page world-foundations-page">
      <header className="graph-page-header">
        <button
          className="back-button"
          onClick={() => navigate(`/campaigns/${campaignId}/graphs`)}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Graphs
        </button>
        <div className="header-content">
          <BookOpen className="w-8 h-8" />
          <div>
            <h1>World Foundations</h1>
            <p className="subtitle">Immutable truths about your world</p>
          </div>
        </div>
      </header>

      <div className="graph-placeholder">
        <p>Documentation structure visualization coming soon...</p>
        <p className="graph-note">
          No confidence decay for this graph
          <br />
          These represent fundamental truths about your world that never change
          <br />
          Perfect for world-building constants and lore
        </p>
      </div>
    </div>
  );
};

export { WorldFoundationsPage };
export default WorldFoundationsPage;
