/**
 * MCP Prompts Registry and Dispatcher
 * Central management for all prompt definitions
 */

import { importPromptDefinition, handleImportPrompt } from './import-workflow';
import { planningPromptDefinition, handlePlanningPrompt } from './planning-workflow';
import { campaignStructureExamplesDefinition, handleCampaignStructureExamples } from './campaign-structure-examples';

// Prompt definition interface
interface PromptDefinition {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  handler: (args: any) => Promise<any>;
}

// Registry of all available prompts
export const PROMPT_REGISTRY: PromptDefinition[] = [
  importPromptDefinition,
  planningPromptDefinition,
  campaignStructureExamplesDefinition
];

/**
 * Dispatch prompt requests to appropriate handlers
 */
export async function handleGetPrompt(name: string, args: any): Promise<{
  description: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  }>;
}> {
  // Find the appropriate handler based on prompt name
  if (name === 'import_workflow') {
    return handleImportPrompt(args);
  } else if (name === 'planning_workflow') {
    return handlePlanningPrompt(args);
  } else if (name === 'campaign_structure_examples') {
    return handleCampaignStructureExamples(args);
  }

  // No matching prompt found
  throw new Error(`Unknown prompt: ${name}`);
}