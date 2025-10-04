/**
 * MCP Configuration Types
 * Feature: 008-create-byollm-configuration
 *
 * Model Context Protocol settings for bulk operations
 * (automatic configuration, hidden from users like Notion permissions)
 */
export interface MCPConfig {
    id: string;
    configId: string;
    streamingEnabled: boolean;
    timeoutSeconds: number;
    retryAttempts: number;
    createdAt: number;
    updatedAt: number;
}
export declare const DEFAULT_MCP_CONFIG: {
    readonly streamingEnabled: true;
    readonly timeoutSeconds: 30;
    readonly retryAttempts: 3;
};
export interface MCPTestRequest {
    configId: string;
}
export interface MCPTestResponse {
    success: boolean;
    provider: string;
    modelName: string;
    contextWindow: number;
    bulkOperationsReady: boolean;
    error?: string;
    latencyMs?: number;
}
//# sourceMappingURL=MCPConfig.d.ts.map