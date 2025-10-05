/**
 * Main App Component
 */

import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ViewModeProvider } from './contexts/ViewModeContext';
import { InformationLevelProvider } from './contexts/InformationLevelContext';
import { CardProvider } from './contexts/CardContext';
import { AITabProvider } from './contexts/AITabContext';
import { PublicLanding } from './components/PublicLanding';
import { CampaignManagement } from './components/CampaignManagement';
import { CampaignHomepage } from './components/CampaignHomepage';
import { CardPage } from './pages/CardPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { FloatingEasel } from './components/FloatingEasel';

/**
 * AppContent - Handles routes and conditional FloatingEasel rendering
 * Must be inside BrowserRouter to use useLocation
 */
function AppContent() {
  const location = useLocation();

  // Show FloatingEasel on campaign pages and card pages (content editing pages)
  // Hide on: public landing (/), campaigns list (/campaigns)
  const showEasel = location.pathname.startsWith('/campaigns/') &&
                    location.pathname !== '/campaigns';

  return (
    <>
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
        <Route
          path="/campaigns/:campaignId/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Feature 004: Floating Easel for selecting active information level */}
      {showEasel && <FloatingEasel />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ViewModeProvider>
        <InformationLevelProvider>
          <CardProvider>
            <AITabProvider>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </AITabProvider>
          </CardProvider>
        </InformationLevelProvider>
      </ViewModeProvider>
    </AuthProvider>
  );
}

export default App;
