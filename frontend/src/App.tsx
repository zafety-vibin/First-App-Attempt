/**
 * Main App Component
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ViewModeProvider } from './contexts/ViewModeContext';
import { InformationLevelProvider } from './contexts/InformationLevelContext';
import { CardProvider } from './contexts/CardContext';
import { PublicLanding } from './components/PublicLanding';
import { CampaignManagement } from './components/CampaignManagement';
import { CampaignHomepage } from './components/CampaignHomepage';
import { CardPage } from './pages/CardPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <ViewModeProvider>
        <InformationLevelProvider>
          <CardProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<PublicLanding />} />
                <Route
                  path="/campaigns"
                  element={
                    <ProtectedRoute>
                      <CampaignManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/campaigns/:id"
                  element={
                    <ProtectedRoute>
                      <CampaignHomepage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/campaigns/:campaignId/cards/:cardId"
                  element={
                    <ProtectedRoute>
                      <CardPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </CardProvider>
        </InformationLevelProvider>
      </ViewModeProvider>
    </AuthProvider>
  );
}

export default App;
