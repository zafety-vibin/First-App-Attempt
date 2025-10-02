/**
 * CORS middleware configuration
 * Based on: specs/002-create-the-authentication/research.md section 6
 */

import cors from 'cors';

export const corsOptions: cors.CorsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-View-Mode'], // Feature 004: Allow view mode header
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);
