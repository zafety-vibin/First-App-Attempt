"use strict";
/**
 * Custom Endpoint Configuration Types
 * Feature: 008-create-byollm-configuration
 *
 * Additional metadata for custom local LLM endpoints (Ollama, LM Studio, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCAL_LLM_PRESETS = void 0;
// Common local LLM presets
exports.LOCAL_LLM_PRESETS = {
    ollama: {
        name: 'Ollama',
        baseUrl: 'http://localhost:11434',
        modelFormat: 'openai_compatible',
        supportsStreaming: true,
        authRequired: false,
    },
    lmstudio: {
        name: 'LM Studio',
        baseUrl: 'http://localhost:1234',
        modelFormat: 'openai_compatible',
        supportsStreaming: true,
        authRequired: false,
    },
};
//# sourceMappingURL=CustomEndpointConfig.js.map