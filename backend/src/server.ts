/**
 * Express server setup
 * Based on: specs/002-create-the-authentication/research.md
 */

import express from 'express';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import settingRoutes from './routes/settings';
import cardRoutes from './routes/cards';
import databaseCardRoutes from './routes/database-cards';
import informationLevelRoutes from './routes/information-levels';
import healthRoutes from './routes/health';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/information-levels', informationLevelRoutes); // Feature 004
app.use('/api/cards', cardRoutes);
app.use('/api/cards', databaseCardRoutes);

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
