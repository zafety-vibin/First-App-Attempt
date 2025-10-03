/**
 * MCP Resources Registry and Dispatcher
 * Central management for all resource definitions
 */

import { cardsResourceDefinition, handleCardsResource } from './cards-resource';
import { recapsResourceDefinition, handleRecapsResource } from './recaps-resource';
import { graphsResourceDefinition, handleGraphsResource } from './graphs-resource';

// Resource definition interface
interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: (uri: string) => Promise<any>;
}

// Registry of all available resources
export const RESOURCE_REGISTRY: ResourceDefinition[] = [
  cardsResourceDefinition,
  recapsResourceDefinition,
  graphsResourceDefinition
];

/**
 * Dispatch resource read requests to appropriate handlers
 */
export async function handleReadResource(uri: string): Promise<{
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}> {
  // Find the appropriate handler based on URI pattern
  if (uri.includes('/cards')) {
    return handleCardsResource(uri);
  } else if (uri.includes('/recaps')) {
    return handleRecapsResource(uri);
  } else if (uri.includes('/graphs')) {
    return handleGraphsResource(uri);
  }

  // No matching resource found
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify({
        error: 'UNKNOWN_RESOURCE',
        message: `Unknown resource URI: ${uri}`
      })
    }]
  };
}