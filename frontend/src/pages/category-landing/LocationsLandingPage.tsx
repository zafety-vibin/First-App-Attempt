/**
 * LocationsLandingPage - Landing page for Locations category
 * Feature: 015-create-the-dashboard (T023)
 * Shows canvas with category-filtered widgets and rich text editor
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { CategoryLandingCanvas } from '../../components/dashboard/CategoryLandingCanvas';

export const LocationsLandingPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Error: Campaign ID not found</p>
      </div>
    );
  }

  return <CategoryLandingCanvas campaignId={campaignId} category="locations" />;
};
