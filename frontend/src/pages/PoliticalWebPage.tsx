/**
 * Feature 006: Political-Web Graph Page
 * Force graph of faction relationships
 * Confidence = relationship strength
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';

const PoliticalWebPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  return (
    <div className="graph-page political-web-page">
      <header className="graph-page-header">
        <button
          className="back-button"
          onClick={() => navigate(`/campaigns/${campaignId}/graphs`)}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Graphs
        </button>
        <div className="header-content">
          <Users className="w-8 h-8" />
          <div>
            <h1>Political Web</h1>
            <p className="subtitle">Faction relationships and alliances</p>
          </div>
        </div>
      </header>

      <div className="graph-placeholder">
        <p>Force graph visualization coming soon...</p>
        <p className="graph-note">
          Confidence represents relationship strength:
          <br />
          1.0 = Sworn allies or bitter enemies
          <br />
          0.0 = Distant or weak connections
        </p>
      </div>
    </div>
  );
};

export { PoliticalWebPage };
export default PoliticalWebPage;