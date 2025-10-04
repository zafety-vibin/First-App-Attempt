"use strict";
/**
 * InformationLevel entity
 * Feature: 004-create-a-tagging
 * Based on: specs/004-create-a-tagging/data-model.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INFORMATION_LEVEL_COLORS = exports.DEFAULT_INFORMATION_LEVELS = void 0;
/**
 * Default information levels (seeded on database initialization)
 */
exports.DEFAULT_INFORMATION_LEVELS = {
    SYSTEM: 'system', // Gray (#6B7280), non-hierarchical
    COMMON_KNOWLEDGE: 'common-knowledge', // Blue (#3B82F6), non-hierarchical
    PLAYER_KNOWLEDGE: 'player-knowledge', // Green (#10B981), non-hierarchical
    DM_SECRET: 'dm-secret', // Red (#EF4444), hierarchical
};
/**
 * Information level colors
 */
exports.INFORMATION_LEVEL_COLORS = {
    [exports.DEFAULT_INFORMATION_LEVELS.SYSTEM]: '#6B7280',
    [exports.DEFAULT_INFORMATION_LEVELS.COMMON_KNOWLEDGE]: '#3B82F6',
    [exports.DEFAULT_INFORMATION_LEVELS.PLAYER_KNOWLEDGE]: '#10B981',
    [exports.DEFAULT_INFORMATION_LEVELS.DM_SECRET]: '#EF4444',
};
//# sourceMappingURL=InformationLevel.js.map