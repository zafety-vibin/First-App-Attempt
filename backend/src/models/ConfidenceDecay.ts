/**
 * Confidence Decay System Types
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * Temporal awareness and confidence decay calculations
 * All entities start with confidence 1.0 and decay over time based on graph-specific rates
 */

import { GraphType } from './KnowledgeGraph';

/**
 * Confidence decay configuration per graph
 * Stored in knowledge_graphs table
 */
export interface ConfidenceDecayConfig {
  /** Decay rate per week (0.0-1.0). 0.0 = no decay, 1.0 = full decay in 1 week. */
  decay_rate: number;

  /** Reinforcement boost amount when entity is accessed (0.01-0.5) */
  reinforcement_amount: number;

  /** Active entity confidence threshold (entities below this are considered stale) */
  confidence_threshold: number;

  /** Whether to auto-reinforce entities on query */
  auto_reinforce_on_query: boolean;
}

/**
 * Default decay rates by graph type
 * From confidence-decay.json specification
 */
export const DecayRateDefaults: Record<string, number> = {
  'World-Foundations': 0.0,  // Never decay (magic systems, pantheon are permanent)
  'Political-Web': 0.1,       // ~10 weeks to zero (NPC relationships fade over 2-3 months)
  'Geographical': 0.05,       // ~20 weeks to zero (locations persist longer)
  'Campaign-Story': 0.2,      // ~5 weeks to zero (recent sessions matter most)
  'custom': 0.1,              // Default for custom graph types
};

/**
 * Get default decay rate for a graph type
 */
export function getDefaultDecayRate(graphType: GraphType): number {
  // Handle custom types with custom: prefix
  if (graphType.startsWith('custom:')) {
    return DecayRateDefaults['custom'];
  }
  return DecayRateDefaults[graphType] ?? DecayRateDefaults['custom'];
}

/**
 * Confidence thresholds for AI integration
 * From confidence-decay.json specification
 */
export const ConfidenceThresholds = {
  /** High confidence: > 0.7 (AI uses entity confidently) */
  HIGH: 0.7,

  /** Medium confidence: 0.4 - 0.7 (AI notes it's been a while) */
  MEDIUM: 0.4,

  /** Low confidence: < 0.4 (AI expresses uncertainty, requests refresher) */
  LOW: 0.4,

  /** Active entity threshold: default 0.3 (entities below are stale) */
  ACTIVE: 0.3,
} as const;

/**
 * Confidence level classification
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Get confidence level classification
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= ConfidenceThresholds.HIGH) {
    return 'high';
  }
  if (confidence >= ConfidenceThresholds.MEDIUM) {
    return 'medium';
  }
  return 'low';
}

/**
 * Confidence decay calculation inputs
 */
export interface ConfidenceCalculationInput {
  /** Base confidence (always 1.0 for entities) */
  base_confidence: number;

  /** Graph-specific decay rate (0.0-1.0) */
  decay_rate: number;

  /** Unix timestamp when entity was created */
  created_at: number;

  /** Unix timestamp when entity was last accessed (for reinforcement) */
  last_accessed: number;

  /** Whether entity is pinned (bypasses decay) */
  pinned: boolean;

  /** Current timestamp for calculation */
  current_timestamp: number;
}

/**
 * Confidence decay calculation result
 */
export interface ConfidenceCalculationResult {
  /** Calculated confidence (0.0-1.0) */
  confidence: number;

  /** Number of weeks elapsed since last access */
  weeks_elapsed: number;

  /** Confidence level classification */
  level: ConfidenceLevel;

  /** Whether entity is pinned */
  pinned: boolean;

  /** Decay rate used in calculation */
  decay_rate: number;
}

/**
 * Calculate entity confidence using linear time-based decay formula
 * Formula: confidence = base_confidence * (1 - decay_rate * weeks_elapsed)
 * Pinned entities always return 1.0
 *
 * @param input - Calculation inputs
 * @returns Calculated confidence score (clamped to [0.0, 1.0])
 */
export function calculateConfidence(input: ConfidenceCalculationInput): ConfidenceCalculationResult {
  // Pinned entities bypass decay
  if (input.pinned) {
    return {
      confidence: 1.0,
      weeks_elapsed: 0,
      level: 'high',
      pinned: true,
      decay_rate: input.decay_rate,
    };
  }

  // Calculate weeks elapsed since last access
  const secondsElapsed = input.current_timestamp - input.last_accessed;
  const weeksElapsed = secondsElapsed / (7 * 24 * 60 * 60);

  // Apply linear decay formula
  const rawConfidence = input.base_confidence * (1 - input.decay_rate * weeksElapsed);

  // Clamp to [0.0, 1.0]
  const confidence = Math.max(0.0, Math.min(1.0, rawConfidence));

  return {
    confidence,
    weeks_elapsed: weeksElapsed,
    level: getConfidenceLevel(confidence),
    pinned: false,
    decay_rate: input.decay_rate,
  };
}

/**
 * Calculate observation confidence (same formula as entity confidence)
 */
export function calculateObservationConfidence(
  decay_rate: number,
  created_at: number,
  last_accessed: number,
  current_timestamp: number
): number {
  const input: ConfidenceCalculationInput = {
    base_confidence: 1.0,
    decay_rate,
    created_at,
    last_accessed,
    pinned: false, // Observations cannot be pinned
    current_timestamp,
  };
  return calculateConfidence(input).confidence;
}

/**
 * Calculate relation confidence (average of two entity confidences)
 */
export function calculateRelationConfidence(
  fromEntityConfidence: number,
  toEntityConfidence: number
): number {
  return (fromEntityConfidence + toEntityConfidence) / 2.0;
}

/**
 * Reinforcement result
 */
export interface ReinforcementResult {
  /** Entity name */
  entity_name: string;

  /** Confidence before reinforcement */
  old_confidence: number;

  /** Confidence after reinforcement (clamped to 1.0) */
  new_confidence: number;

  /** Updated last_accessed timestamp */
  last_accessed: number;

  /** Weeks elapsed before reinforcement */
  weeks_elapsed: number;
}

/**
 * Reinforcement options
 */
export interface ReinforcementOptions {
  /** Optional custom boost amount (0.01-0.5). Defaults to graph's reinforcement_amount. */
  boost_amount?: number;
}

/**
 * Default confidence decay configuration
 */
export const DEFAULT_DECAY_CONFIG: ConfidenceDecayConfig = {
  decay_rate: 0.1,
  reinforcement_amount: 0.1,
  confidence_threshold: 0.3,
  auto_reinforce_on_query: true,
};

/**
 * Validation constants
 */
export const DECAY_RATE_MIN = 0.0;
export const DECAY_RATE_MAX = 1.0;
export const REINFORCEMENT_MIN = 0.01;
export const REINFORCEMENT_MAX = 0.5;
export const CONFIDENCE_MIN = 0.0;
export const CONFIDENCE_MAX = 1.0;

/**
 * Validate decay rate
 */
export function isValidDecayRate(rate: number): boolean {
  return rate >= DECAY_RATE_MIN && rate <= DECAY_RATE_MAX;
}

/**
 * Validate reinforcement amount
 */
export function isValidReinforcementAmount(amount: number): boolean {
  return amount >= REINFORCEMENT_MIN && amount <= REINFORCEMENT_MAX;
}

/**
 * Time conversion constants
 */
export const SECONDS_PER_WEEK = 7 * 24 * 60 * 60;
export const SECONDS_PER_DAY = 24 * 60 * 60;
export const SECONDS_PER_HOUR = 60 * 60;

/**
 * Convert weeks to seconds
 */
export function weeksToSeconds(weeks: number): number {
  return weeks * SECONDS_PER_WEEK;
}

/**
 * Convert seconds to weeks
 */
export function secondsToWeeks(seconds: number): number {
  return seconds / SECONDS_PER_WEEK;
}
