/**
 * Custom Endpoint Configuration Types
 * Feature: 008-create-byollm-configuration
 *
 * Additional metadata for custom local LLM endpoints (Ollama, LM Studio, etc.)
 */
export interface CustomEndpointConfig {
    id: string;
    configId: string;
    baseUrl: string;
    authHeaderName: string | null;
    authHeaderValue: string | null;
    modelFormat: 'openai_compatible' | 'anthropic_compatible' | 'custom';
    supportsStreaming: boolean;
    createdAt: number;
    updatedAt: number;
}
export interface CustomEndpointRequest {
    baseUrl: string;
    authHeaderName?: string;
    authHeaderValue?: string;
    modelFormat?: 'openai_compatible' | 'anthropic_compatible' | 'custom';
    supportsStreaming?: boolean;
}
export declare const LOCAL_LLM_PRESETS: {
    readonly ollama: {
        readonly name: "Ollama";
        readonly baseUrl: "http://localhost:11434";
        readonly modelFormat: "openai_compatible";
        readonly supportsStreaming: true;
        readonly authRequired: false;
    };
    readonly lmstudio: {
        readonly name: "LM Studio";
        readonly baseUrl: "http://localhost:1234";
        readonly modelFormat: "openai_compatible";
        readonly supportsStreaming: true;
        readonly authRequired: false;
    };
};
//# sourceMappingURL=CustomEndpointConfig.d.ts.map