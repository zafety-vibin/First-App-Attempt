/**
 * Express server setup
 * Based on: specs/002-create-the-authentication/research.md
 */

import express from 'express';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { db } from './services/DatabaseService';
import { createDatabaseChangeDetectionService } from './services/DatabaseChangeDetectionService';
import { createSessionImportService } from './services/SessionImportService';
import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import campaignWizardRoutes from './routes/campaign-wizard'; // Feature 016
import settingRoutes from './routes/settings';
import cardRoutes from './routes/cards';
import databaseCardRoutes from './routes/database-cards';
import informationLevelRoutes from './routes/information-levels';
import { imageServeRouter, imageUploadRouter } from './routes/images';
import byollmRoutes from './routes/byollm';
import healthRoutes from './routes/health';
// Feature 014 category routes
import npcRoutes from './routes/npcs';
import locationRoutes from './routes/locations';
import factionRoutes from './routes/factions';
import sessionRecapRoutes from './routes/sessionRecaps';
import questRoutes from './routes/quests';
import playerCharacterRoutes from './routes/playerCharacters';
import loreEntryRoutes from './routes/loreEntries';
import worldRuleRoutes from './routes/worldRules';
import planarForceRoutes from './routes/planarForces';
import sessionPrepRoutes from './routes/sessionPrep';
import customMechanicRoutes from './routes/customMechanics';
import itemRoutes from './routes/items';
import creatureRoutes from './routes/creatures';
// Feature 015 canvas routes
import dashboardConfigRoutes from './routes/dashboardConfigs';
import categoryLandingConfigRoutes from './routes/categoryLandingConfigs';
// Feature 006 knowledge graph routes
import knowledgeGraphRoutes from './routes/knowledge-graphs';
import graphNodeRoutes from './routes/graph-nodes';
import graphEdgeRoutes from './routes/graph-edges';
import graphVersionRoutes from './routes/graph-versions';
import graphToggleRoutes from './routes/graph-toggles';
import crossGraphQueryRoutes from './routes/cross-graph-query';
import confidenceDecayRoutes from './routes/confidence-decay';
import campaignStorySessionRoutes from './routes/campaign-story-sessions';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Campaign-Story services
const changeDetectionService = createDatabaseChangeDetectionService(db);
const sessionImportService = createSessionImportService(db, changeDetectionService);

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use(campaignWizardRoutes); // Feature 016 - wizard routes (must be before general campaign routes for specificity)
app.use('/api/campaigns', campaignRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/information-levels', informationLevelRoutes); // Feature 004
app.use('/api/byollm', byollmRoutes); // Feature 008
// Image routes (Feature 003)
app.use('/api/images', imageServeRouter);  // GET /api/images/:id (public)
app.use('/api/cards', imageUploadRouter);  // POST /api/cards/:id/image (protected)
// Database card routes MUST come before general card routes (more specific routes first)
app.use('/api/cards', databaseCardRoutes);
app.use('/api/cards', cardRoutes);

// Feature 014: Category routes
app.use('/api/npcs', npcRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/factions', factionRoutes);
app.use('/api/session-recaps', sessionRecapRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/player-characters', playerCharacterRoutes);
app.use('/api/lore-entries', loreEntryRoutes);
app.use('/api/world-rules', worldRuleRoutes);
app.use('/api/planar-forces', planarForceRoutes);
app.use('/api/session-prep', sessionPrepRoutes);
app.use('/api/custom-mechanics', customMechanicRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/creatures', creatureRoutes);

// Feature 015: Canvas configuration routes
app.use('/api/dashboard-configs', dashboardConfigRoutes);
app.use('/api/category-landing-configs', categoryLandingConfigRoutes);

// Feature 006: Knowledge Graph routes
app.use(knowledgeGraphRoutes);
app.use(graphNodeRoutes);
app.use(graphEdgeRoutes);
app.use(graphVersionRoutes);
app.use(graphToggleRoutes);
app.use(crossGraphQueryRoutes);
app.use(confidenceDecayRoutes);

// Feature 006 Extension: Campaign-Story session routes
app.use(campaignStorySessionRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✓ Backend server listening on http://localhost:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});

// Export for tests
export default app;
