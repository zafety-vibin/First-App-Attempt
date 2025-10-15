/**
 * Campaign-Story Memory: Dual-Tier Entity System
 * Feature 006 Extension: Timeline with narrative/metadata separation
 *
 * Tier 1 (Narrative): Permanent story content with confidence decay floor
 * Tier 2 (Metadata): Time-windowed audit logs with static low confidence
 */

// ============================================================================
// ENTITY TYPE TAXONOMY
// ============================================================================

/**
 * Narrative Entity Types (Tier 1)
 * Permanent story content that forms the campaign's narrative spine
 */
export type NarrativeNodeType =
  | 'session_recap'        // Core narrative of each session
  | 'major_event'          // Significant story milestones
  | 'player_decision'      // Critical choices that shaped the narrative
  | 'plot_thread'          // Ongoing story arcs across sessions
  | 'character_moment'     // Important character development beats
  | 'discovery'            // Information revealed to players
  | 'quest_objective';     // Specific goals with clear completion criteria

/**
 * Metadata Entity Types (Tier 2)
 * Prunable audit logs tracking database changes between sessions
 */
export type MetadataNodeType =
  | 'import_batch'                // Container for all changes during session import
  | 'database_addition_log'       // New entities added to any memory
  | 'database_modification_log'   // Existing entities updated
  | 'clarification_note'          // Manual corrections or clarifications
  | 'user_correction_log';        // User-initiated fixes to data

export type CampaignStoryNodeType = NarrativeNodeType | MetadataNodeType;

// ============================================================================
// RELATIONSHIP TYPE TAXONOMY
// ============================================================================

/**
 * Narrative Relationships (Story Connections)
 * Connect narrative entities to form story flow
 */
export type NarrativeRelationshipType =
  | 'preceded_by'        // Session sequence (render as arc below timeline)
  | 'followed_by'        // Session sequence (render as arc above timeline)
  | 'contains_event'     // Session contains major event
  | 'caused'             // Event caused consequence
  | 'revealed'           // Discovery uncovered information
  | 'led_to'             // Action resulted in outcome
  | 'complicated_by'     // Thread interfered with by another
  | 'resolved_by'        // Thread closed by action
  | 'player_decided';    // Choice made by party

/**
 * Metadata Relationships (Archival Links)
 * Connect metadata entities to audit trail
 */
export type MetadataRelationshipType =
  | 'logged_during_session'      // Changes logged during specific recap
  | 'documents_addition'         // Log documents new entity
  | 'documents_modification'     // Log documents entity change
  | 'superseded_by'              // Correction replaces previous log
  | 'expires_at_session';        // Automatic pruning trigger

/**
 * Bridge Relationship (Connects Tiers)
 * Links narrative recaps to their metadata logs
 */
export type BridgeRelationshipType = 'has_metadata_log';

export type CampaignStoryRelationshipType =
  | NarrativeRelationshipType
  | MetadataRelationshipType
  | BridgeRelationshipType;

// ============================================================================
// TEMPORAL ANCHOR INTERFACE
// ============================================================================

/**
 * Temporal anchors tie story events to both in-game and real-world time
 * Enables AI temporal awareness and timeline visualization
 */
export interface TemporalAnchors {
  /** Sequential session number (1, 2, 3...) */
  session_number: number;

  /** In-game date in MM/DD/YYYY format (supports 1-4 digit years) */
  in_game_date?: string; // e.g., "3/15/500" or "03/15/0500"

  /** Real-world session date in ISO 8601 format */
  real_world_date: string; // e.g., "2025-04-20"

  /** Cumulative in-game days elapsed since campaign start */
  days_elapsed_total?: number;
}

/**
 * Tier discriminator for query filtering
 */
export type Tier = 'narrative' | 'metadata';

// ============================================================================
// CONFIDENCE DECAY CONFIGURATION
// ============================================================================

/**
 * Confidence decay configuration for Campaign-Story memory
 */
export interface ConfidenceDecayConfig {
  /** Base decay rate per week (0.0-1.0) */
  decay_rate: number;

  /** Minimum confidence floor for narrative content */
  narrative_floor: number;

  /** Static confidence for metadata (never decays) */
  metadata_static: number;
}

/**
 * Default confidence decay settings
 */
export const DEFAULT_DECAY_CONFIG: ConfidenceDecayConfig = {
  decay_rate: 0.2,           // Fades over ~5 weeks
  narrative_floor: 0.35,     // Story content never goes below 35%
  metadata_static: 0.1       // Metadata always at 10%
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if node type is narrative (Tier 1)
 */
export function isNarrativeNode(node_type: string): node_type is NarrativeNodeType {
  const narrativeTypes: NarrativeNodeType[] = [
    'session_recap',
    'major_event',
    'player_decision',
    'plot_thread',
    'character_moment',
    'discovery',
    'quest_objective'
  ];
  return narrativeTypes.includes(node_type as NarrativeNodeType);
}

/**
 * Check if node type is metadata (Tier 2)
 */
export function isMetadataNode(node_type: string): node_type is MetadataNodeType {
  const metadataTypes: MetadataNodeType[] = [
    'import_batch',
    'database_addition_log',
    'database_modification_log',
    'clarification_note',
    'user_correction_log'
  ];
  return metadataTypes.includes(node_type as MetadataNodeType);
}

/**
 * Check if relationship is narrative (story connection)
 */
export function isNarrativeRelationship(edge_type: string): edge_type is NarrativeRelationshipType {
  const narrativeRels: NarrativeRelationshipType[] = [
    'preceded_by',
    'followed_by',
    'contains_event',
    'caused',
    'revealed',
    'led_to',
    'complicated_by',
    'resolved_by',
    'player_decided'
  ];
  return narrativeRels.includes(edge_type as NarrativeRelationshipType);
}

/**
 * Check if relationship is metadata (audit connection)
 */
export function isMetadataRelationship(edge_type: string): edge_type is MetadataRelationshipType {
  const metadataRels: MetadataRelationshipType[] = [
    'logged_during_session',
    'documents_addition',
    'documents_modification',
    'superseded_by',
    'expires_at_session'
  ];
  return metadataRels.includes(edge_type as MetadataRelationshipType);
}

// ============================================================================
// CONFIDENCE SCORE HELPERS
// ============================================================================

/**
 * Get initial confidence score for a node type
 * Metadata nodes always return static 0.1
 * Narrative nodes have variable initial confidence
 */
export function getInitialConfidence(
  node_type: CampaignStoryNodeType,
  config: ConfidenceDecayConfig = DEFAULT_DECAY_CONFIG
): number {
  // Metadata always has static low confidence
  if (isMetadataNode(node_type)) {
    return config.metadata_static;
  }

  // Narrative nodes have variable initial confidence
  switch (node_type) {
    case 'session_recap':
    case 'player_decision':
      return 1.0; // Direct player experience

    case 'major_event':
    case 'discovery':
      return 0.9; // Witnessed events

    case 'character_moment':
      return 0.8; // Observed character development

    case 'plot_thread':
    case 'quest_objective':
      return 0.7; // Inferred from events

    default:
      return 0.5; // Fallback
  }
}

/**
 * Calculate decayed confidence with floor enforcement
 *
 * Formula: confidence = max(initial * e^(-decay_rate * weeks_elapsed), floor)
 *
 * @param initial_confidence - Starting confidence (0.0-1.0)
 * @param created_at - Unix timestamp when node was created
 * @param current_time - Current Unix timestamp (defaults to now)
 * @param decay_rate - Decay rate per week (defaults to 0.2)
 * @param floor - Minimum confidence (defaults to 0.35 for narrative)
 * @returns Decayed confidence clamped to floor
 */
export function calculateDecayedConfidence(
  initial_confidence: number,
  created_at: number,
  current_time: number = Math.floor(Date.now() / 1000),
  decay_rate: number = DEFAULT_DECAY_CONFIG.decay_rate,
  floor: number = DEFAULT_DECAY_CONFIG.narrative_floor
): number {
  // Calculate time elapsed in weeks
  const seconds_elapsed = current_time - created_at;
  const weeks_elapsed = seconds_elapsed / (7 * 24 * 60 * 60);

  // Exponential decay: confidence = initial * e^(-decay_rate * weeks)
  const decayed = initial_confidence * Math.exp(-decay_rate * weeks_elapsed);

  // Clamp to floor
  return Math.max(decayed, floor);
}

/**
 * Apply confidence decay to a Campaign-Story node
 * Metadata nodes always return static confidence (no decay)
 * Narrative nodes decay with floor enforcement
 *
 * @param node_type - Type of node
 * @param initial_confidence - Starting confidence
 * @param created_at - Creation timestamp
 * @param config - Decay configuration
 * @returns Current confidence score
 */
export function applyConfidenceDecay(
  node_type: CampaignStoryNodeType,
  initial_confidence: number,
  created_at: number,
  config: ConfidenceDecayConfig = DEFAULT_DECAY_CONFIG
): number {
  // Metadata never decays
  if (isMetadataNode(node_type)) {
    return config.metadata_static;
  }

  // Narrative nodes decay with floor
  return calculateDecayedConfidence(
    initial_confidence,
    created_at,
    Math.floor(Date.now() / 1000),
    config.decay_rate,
    config.narrative_floor
  );
}

// ============================================================================
// PRUNING HELPERS
// ============================================================================

/**
 * Default retention window for metadata (sessions)
 */
export const DEFAULT_RETENTION_WINDOW = 50;

/**
 * Calculate prune_after_session value for a new metadata node
 *
 * @param current_session_number - Current session being imported
 * @param retention_window - How many sessions to keep (default 50)
 * @returns Session number after which this metadata should be pruned
 */
export function calculatePruneSession(
  current_session_number: number,
  retention_window: number = DEFAULT_RETENTION_WINDOW
): number {
  return current_session_number + retention_window;
}

/**
 * Check if a metadata node should be pruned
 *
 * @param prune_after_session - Session number when node expires
 * @param current_session_number - Current session number
 * @returns True if node should be deleted
 */
export function shouldPruneMetadata(
  prune_after_session: number,
  current_session_number: number
): boolean {
  return current_session_number >= prune_after_session;
}

// ============================================================================
// DATE FORMATTING HELPERS
// ============================================================================

/**
 * Parse in-game date string (MM/DD/YYYY with 1-4 digit years)
 *
 * @param date_string - e.g., "3/15/500" or "03/15/0500"
 * @returns Parsed components or null if invalid
 */
export function parseInGameDate(date_string: string): {
  month: number;
  day: number;
  year: number;
} | null {
  const match = date_string.match(/^(\d{1,2})\/(\d{1,2})\/(\d{1,4})$/);
  if (!match) return null;

  return {
    month: parseInt(match[1], 10),
    day: parseInt(match[2], 10),
    year: parseInt(match[3], 10)
  };
}

/**
 * Format in-game date for display
 *
 * @param date_string - e.g., "3/15/500"
 * @returns Formatted string e.g., "March 15, Year 500"
 */
export function formatInGameDate(date_string: string): string {
  const parsed = parseInGameDate(date_string);
  if (!parsed) return date_string;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const month_name = months[parsed.month - 1] || `Month ${parsed.month}`;
  return `${month_name} ${parsed.day}, Year ${parsed.year}`;
}

/**
 * Convert in-game date to sortable timestamp (for timeline positioning)
 * Assumes day 1 of campaign = timestamp 0
 *
 * @param date_string - e.g., "3/15/500"
 * @param days_elapsed_total - Total days since campaign start
 * @returns Unix-style timestamp (not real-world, just for sorting)
 */
export function inGameDateToTimestamp(
  date_string: string,
  days_elapsed_total: number
): number {
  // Use days_elapsed_total as the sortable value
  // This allows proper timeline positioning even with non-standard calendars
  return days_elapsed_total * 24 * 60 * 60; // Convert days to "seconds" for consistency
}
