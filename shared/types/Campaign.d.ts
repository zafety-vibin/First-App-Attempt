/**
 * Campaign entity - Represents a TTRPG campaign workspace
 */
export interface Campaign {
    id: string;
    name: string;
    ownerId: string;
    settingId: string | null;
    publicUrlId: string | null;
    publicAccessEnabled: boolean;
    publicPassword: string | null;
    lastPublishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Database row representation (before transformation)
 */
export interface CampaignRow {
    id: string;
    name: string;
    owner_id: string;
    setting_id: string | null;
    public_url_id: string | null;
    public_access_enabled: number;
    public_password: string | null;
    last_published_at: number | null;
    created_at: number;
    updated_at: number;
}
/**
 * Campaign creation input
 */
export interface CreateCampaignInput {
    name: string;
    ownerId: string;
    settingId?: string | null;
}
/**
 * Campaign update input
 */
export interface UpdateCampaignInput {
    name?: string;
    publicAccessEnabled?: boolean;
    publicPassword?: string | null;
}
//# sourceMappingURL=Campaign.d.ts.map