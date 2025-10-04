/**
 * InformationLevel entity
 * Feature: 004-create-a-tagging
 * Based on: specs/004-create-a-tagging/data-model.md
 */
export interface InformationLevel {
    id: string;
    name: string;
    color: string;
    hierarchical: boolean;
    type: 'default' | 'custom';
    campaignId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Default information levels (seeded on database initialization)
 */
export declare const DEFAULT_INFORMATION_LEVELS: {
    readonly SYSTEM: "system";
    readonly COMMON_KNOWLEDGE: "common-knowledge";
    readonly PLAYER_KNOWLEDGE: "player-knowledge";
    readonly DM_SECRET: "dm-secret";
};
/**
 * Information level colors
 */
export declare const INFORMATION_LEVEL_COLORS: {
    readonly system: "#6B7280";
    readonly "common-knowledge": "#3B82F6";
    readonly "player-knowledge": "#10B981";
    readonly "dm-secret": "#EF4444";
};
/**
 * Create InformationLevel payload (for POST /api/information-levels)
 */
export interface CreateInformationLevelPayload {
    name: string;
    color: string;
    hierarchical: boolean;
    campaignId: string;
}
/**
 * Update InformationLevel payload (for PUT /api/information-levels/:id)
 */
export interface UpdateInformationLevelPayload {
    name?: string;
    color?: string;
    hierarchical?: boolean;
}
//# sourceMappingURL=InformationLevel.d.ts.map