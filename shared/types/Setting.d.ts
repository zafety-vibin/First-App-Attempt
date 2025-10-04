/**
 * Setting (World/Universe Container)
 * Top-level organizational container representing a fictional world/setting.
 * Feature: 003-create-a-notion
 */
export interface Setting {
    id: string;
    ownerId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Create Setting Request (from client)
 */
export interface CreateSettingRequest {
    name: string;
    description?: string | null;
}
/**
 * Update Setting Request (from client)
 */
export interface UpdateSettingRequest {
    name?: string;
    description?: string | null;
}
//# sourceMappingURL=Setting.d.ts.map