/**
 * Main App Component
 * T067: Updated with Feature 015 category pages and dashboard routing
 */

import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ViewModeProvider } from './contexts/ViewModeContext';
import { InformationLevelProvider } from './contexts/InformationLevelContext';
import { CardProvider } from './contexts/CardContext';
import { DashboardProvider } from './contexts/DashboardContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { PublicLanding } from './components/PublicLanding';
import { CampaignManagement } from './components/CampaignManagement';
import { CampaignHomepage } from './components/CampaignHomepage';
import { CardPage } from './pages/CardPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { NPCListPage } from './pages/NPCListPage';
import { LocationListPage } from './pages/LocationListPage';
import { FactionListPage } from './pages/FactionListPage';
import { QuestListPage } from './pages/QuestListPage';
import { SessionRecapListPage } from './pages/SessionRecapListPage';
import { PlayerCharacterListPage } from './pages/PlayerCharacterListPage';
import { LoreEntryListPage } from './pages/LoreEntryListPage';
import { WorldRuleListPage } from './pages/WorldRuleListPage';
import { PlanarForceListPage } from './pages/PlanarForceListPage';
import { SessionPrepListPage } from './pages/SessionPrepListPage';
import { CustomMechanicListPage } from './pages/CustomMechanicListPage';
import { ItemListPage } from './pages/ItemListPage';
import { CreatureListPage } from './pages/CreatureListPage';
import { GenericCategoryDetailView } from './components/pages/GenericCategoryDetailView';
import { ProtectedRoute } from './components/ProtectedRoute';
import { FloatingEasel } from './components/FloatingEasel';
import { Sidebar } from './components/navigation/Sidebar';

/**
 * CampaignLayout - Wraps campaign pages with Sidebar and DashboardProvider
 * Used for dashboard and category pages
 */
function CampaignLayout({ children, campaignId }: { children: React.ReactNode; campaignId: string }) {
  return (
    <SidebarProvider campaignId={campaignId}>
      <DashboardProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar campaignId={campaignId} />
          <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
        </div>
      </DashboardProvider>
    </SidebarProvider>
  );
}

/**
 * CampaignLayoutWrapper - Extracts campaignId from route params and wraps with CampaignLayout
 */
function CampaignLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Error: Campaign ID not found</p>
      </div>
    );
  }

  return <CampaignLayout campaignId={campaignId}>{children}</CampaignLayout>;
}

/**
 * AppContent - Handles routes and conditional FloatingEasel rendering
 * Must be inside BrowserRouter to use useLocation
 * T067: Added Feature 015 category routes
 */
function AppContent() {
  const location = useLocation();

  // Show FloatingEasel ONLY on wiki and card pages (Feature 003/004)
  // The easel is for selecting information levels when creating/editing cards
  // Hide on: dashboard, category pages, settings (these use different filtering)
  const isWikiPage = /^\/campaigns\/[^/]+$/.test(location.pathname);
  const isCardPage = /^\/campaigns\/[^/]+\/cards\/[^/]+$/.test(location.pathname);
  const showEasel = isWikiPage || isCardPage;

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

        {/* Original campaign homepage route (backward compatibility) */}
        <Route
          path="/campaigns/:id"
          element={
            <ProtectedRoute>
              <CampaignHomepage />
            </ProtectedRoute>
          }
        />

        {/* Feature 015: Dashboard Page */}
        <Route
          path="/campaigns/:campaignId/dashboard"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <DashboardPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Feature 015: Category List Pages */}
        <Route
          path="/campaigns/:campaignId/npcs"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <NPCListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/locations"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <LocationListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/factions"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <FactionListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/quests"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <QuestListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/session_recaps"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <SessionRecapListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/player_characters"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <PlayerCharacterListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/lore_entries"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <LoreEntryListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/world_rules"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <WorldRuleListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/planar_forces"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <PlanarForceListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/session_prep"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <SessionPrepListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/custom_mechanics"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <CustomMechanicListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/items"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <ItemListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/creatures"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <CreatureListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Feature 003: Card routes (must come BEFORE generic category route) */}
        <Route
          path="/campaigns/:campaignId/cards/:cardId"
          element={
            <ProtectedRoute>
              <CardPage />
            </ProtectedRoute>
          }
        />

        {/* Settings route (must come BEFORE generic category route) */}
        <Route
          path="/campaigns/:campaignId/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Feature 015: Category Detail Pages (generic catch-all route, must be LAST) */}
        <Route
          path="/campaigns/:campaignId/:category/:entityId"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <GenericCategoryDetailView />
              </CampaignLayoutWrapper>
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
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </CardProvider>
        </InformationLevelProvider>
      </ViewModeProvider>
    </AuthProvider>
  );
}

export default App;
