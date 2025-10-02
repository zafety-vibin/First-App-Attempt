/**
 * CORS middleware configuration
 * Based on: specs/002-create-the-authentication/research.md section 6
 */

import cors from 'cors';

export const corsOptions: cors.CorsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow both localhost and 127.0.0.1
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Added PATCH for move/reorder
  allowedHeaders: ['Content-Type', 'Authorization', 'X-View-Mode'], // Feature 004: Allow view mode header
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);
