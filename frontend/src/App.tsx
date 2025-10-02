/**
 * Main App Component
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ViewModeProvider } from './contexts/ViewModeContext';
import { InformationLevelProvider } from './contexts/InformationLevelContext';
import { PublicLanding } from './components/PublicLanding';
import { CampaignManagement } from './components/CampaignManagement';
import { CampaignHomepage } from './components/CampaignHomepage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <ViewModeProvider>
        <InformationLevelProvider>
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
            </Routes>
          </BrowserRouter>
        </InformationLevelProvider>
      </ViewModeProvider>
    </AuthProvider>
  );
}

export default App;
