/**
 * Zod schemas for Recap tools
 * Based on contracts/recap-tools.json
 */

import { z } from 'zod';

// get_session_recaps schemas
export const GetSessionRecapsInputSchema = z.object({
  campaign_id: z.string().min(1),
  limit: z.number().int().positive().max(50).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
  include_content: z.boolean().optional().default(true)
});

export const GetSessionRecapsOutputSchema = z.object({
  recaps: z.array(z.object({
    id: z.string(),
    session_number: z.number().int(),
    session_date: z.number().int(),
    title: z.string(),
    summary: z.string(),
    content: z.record(z.any()).optional(), // ProseMirror JSON
    player_notes: z.string().optional(),
    dm_notes: z.string().optional(),
    xp_awarded: z.number().int().optional(),
    treasure_found: z.string().optional(),
    created_at: z.number().int(),
    updated_at: z.number().int()
  })),
  total_count: z.number().int(),
  has_more: z.boolean()
});

// get_timeline_events schemas
export const GetTimelineEventsInputSchema = z.object({
  campaign_id: z.string().min(1),
  start_date: z.number().int().optional(),
  end_date: z.number().int().optional(),
  event_type: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(50)
});

export const GetTimelineEventsOutputSchema = z.object({
  events: z.array(z.object({
    id: z.string(),
    event_date: z.number().int(),
    event_type: z.string(),
    title: z.string(),
    description: z.string(),
    location: z.string().optional(),
    participants: z.array(z.string()).optional(),
    session_id: z.string().optional(),
    importance: z.enum(['minor', 'moderate', 'major', 'critical']).optional(),
    is_canon: z.boolean()
  })),
  timeline_summary: z.object({
    earliest_date: z.number().int().nullable(),
    latest_date: z.number().int().nullable(),
    total_events: z.number().int(),
    event_types: z.array(z.string())
  })
});