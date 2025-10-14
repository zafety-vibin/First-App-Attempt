/**
 * Main App Component
 * T067: Updated with Feature 015 category pages and dashboard routing
 * T006: Added react-grid-layout CSS imports for dashboard canvas system
 */

import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
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
import { CategoryCreatePageRoute } from './pages/CategoryCreatePageRoute';
import { CategoryEditPageRoute } from './pages/CategoryEditPageRoute';
import { NPCsLandingPage } from './pages/category-landing/NPCsLandingPage';
import { LocationsLandingPage } from './pages/category-landing/LocationsLandingPage';
import { FactionsLandingPage } from './pages/category-landing/FactionsLandingPage';
import { QuestsLandingPage } from './pages/category-landing/QuestsLandingPage';
import { SessionRecapsLandingPage } from './pages/category-landing/SessionRecapsLandingPage';
import { PlayerCharactersLandingPage } from './pages/category-landing/PlayerCharactersLandingPage';
import { LoreEntriesLandingPage } from './pages/category-landing/LoreEntriesLandingPage';
import { WorldRulesLandingPage } from './pages/category-landing/WorldRulesLandingPage';
import { PlanarForcesLandingPage } from './pages/category-landing/PlanarForcesLandingPage';
import { SessionPrepLandingPage } from './pages/category-landing/SessionPrepLandingPage';
import { CustomMechanicsLandingPage } from './pages/category-landing/CustomMechanicsLandingPage';
import { ItemsLandingPage } from './pages/category-landing/ItemsLandingPage';
import { CreaturesLandingPage } from './pages/category-landing/CreaturesLandingPage';

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

        {/* Feature 015: Category Landing Pages (with canvas) - T023 */}
        <Route
          path="/campaigns/:campaignId/npcs"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <NPCsLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/locations"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <LocationsLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/factions"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <FactionsLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/quests"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <QuestsLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/session_recaps"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <SessionRecapsLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/player_characters"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <PlayerCharactersLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/lore_entries"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <LoreEntriesLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/world_rules"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <WorldRulesLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/planar_forces"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <PlanarForcesLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/session_prep"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <SessionPrepLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/custom_mechanics"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <CustomMechanicsLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/items"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <ItemsLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/creatures"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <CreaturesLandingPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Feature 015: Category Database Table Views - T023 */}
        <Route
          path="/campaigns/:campaignId/npcs/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <NPCListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/locations/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <LocationListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/factions/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <FactionListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/quests/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <QuestListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/session_recaps/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <SessionRecapListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/player_characters/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <PlayerCharacterListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/lore_entries/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <LoreEntryListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/world_rules/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <WorldRuleListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/planar_forces/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <PlanarForceListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/session_prep/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <SessionPrepListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/custom_mechanics/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <CustomMechanicListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/items/database"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <ItemListPage />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:campaignId/creatures/database"
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

        {/* Feature 015: Category Create Pages - T030 (must come BEFORE detail route) */}
        <Route
          path="/campaigns/:campaignId/:category/create"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <CategoryCreatePageRoute />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Feature 015: Category Edit Pages - T031 (must come BEFORE detail route) */}
        <Route
          path="/campaigns/:campaignId/:category/:entityId/edit"
          element={
            <ProtectedRoute>
              <CampaignLayoutWrapper>
                <CategoryEditPageRoute />
              </CampaignLayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Feature 015: Category Detail Pages - T029 (generic catch-all route, must be LAST) */}
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
