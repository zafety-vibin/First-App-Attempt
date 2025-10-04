/**
 * Function Calling Service
 * Feature: 005-create-the-ai
 * Converts Zod schemas to OpenAI and Anthropic function calling formats
 */

import { z } from 'zod';

/**
 * Convert a Zod schema to OpenAI function format
 * Reference: research.md lines 258-320
 */
export function zodToOpenAISchema(zodSchema: z.ZodType<any>): any {
  const def = zodSchema._def as any;

  if (def.typeName === 'ZodObject' || zodSchema instanceof z.ZodObject) {
    const shape = def.shape ? def.shape() : {};
    const properties: any = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodType<any>;
      properties[key] = zodFieldToOpenAI(fieldSchema);

      // Check if field is required (not optional)
      if (!fieldSchema.isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return zodFieldToOpenAI(zodSchema);
}

/**
 * Convert a single Zod field to OpenAI format
 */
function zodFieldToOpenAI(zodField: z.ZodType<any>): any {
  const def = zodField._def as any;

  switch (def.typeName) {
    case 'ZodString':
      const stringDef: any = { type: 'string' };
      if ((def as any).checks) {
        const checks = (def as any).checks;
        for (const check of checks) {
          if (check.kind === 'min') stringDef.minLength = check.value;
          if (check.kind === 'max') stringDef.maxLength = check.value;
        }
      }
      return stringDef;

    case 'ZodNumber':
      const numberDef: any = { type: 'number' };
      if ((def as any).checks) {
        const checks = (def as any).checks;
        for (const check of checks) {
          if (check.kind === 'int') numberDef.type = 'integer';
          if (check.kind === 'min') numberDef.minimum = check.value;
          if (check.kind === 'max') numberDef.maximum = check.value;
        }
      }
      return numberDef;

    case 'ZodBoolean':
      return { type: 'boolean' };

    case 'ZodArray':
      return {
        type: 'array',
        items: zodFieldToOpenAI((def as any).type),
      };

    case 'ZodEnum':
      return {
        type: 'string',
        enum: (def as any).values,
      };

    case 'ZodNullable':
      const innerType = zodFieldToOpenAI((def as any).innerType);
      return { ...innerType, nullable: true };

    case 'ZodOptional':
      return zodFieldToOpenAI((def as any).innerType);

    case 'ZodRecord':
      return {
        type: 'object',
        additionalProperties: true,
      };

    case 'ZodAny':
      return { type: 'object', additionalProperties: true };

    default:
      return { type: 'string' }; // Fallback
  }
}

/**
 * Convert a Zod schema to Anthropic tool format
 * Reference: research.md lines 258-320
 */
export function zodToAnthropicSchema(zodSchema: z.ZodType<any>): any {
  // Anthropic uses a similar but slightly different format
  const def = zodSchema._def as any;

  if (def.typeName === 'ZodObject' || zodSchema instanceof z.ZodObject) {
    const shape = def.shape ? def.shape() : {};
    const properties: any = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodType<any>;
      properties[key] = zodFieldToAnthropic(fieldSchema);

      if (!fieldSchema.isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }

  return zodFieldToAnthropic(zodSchema);
}

/**
 * Convert a single Zod field to Anthropic format
 */
function zodFieldToAnthropic(zodField: z.ZodType<any>): any {
  const def = zodField._def as any;

  switch (def.typeName) {
    case 'ZodString':
      const stringDef: any = { type: 'string' };
      if ((def as any).checks) {
        const checks = (def as any).checks;
        for (const check of checks) {
          if (check.kind === 'min') stringDef.min_length = check.value;
          if (check.kind === 'max') stringDef.max_length = check.value;
        }
      }
      return stringDef;

    case 'ZodNumber':
      const numberDef: any = { type: 'number' };
      if ((def as any).checks) {
        const checks = (def as any).checks;
        for (const check of checks) {
          if (check.kind === 'int') numberDef.type = 'integer';
          if (check.kind === 'min') numberDef.minimum = check.value;
          if (check.kind === 'max') numberDef.maximum = check.value;
        }
      }
      return numberDef;

    case 'ZodBoolean':
      return { type: 'boolean' };

    case 'ZodArray':
      return {
        type: 'array',
        items: zodFieldToAnthropic((def as any).type),
      };

    case 'ZodEnum':
      return {
        type: 'string',
        enum: (def as any).values,
      };

    case 'ZodNullable':
      const innerType = zodFieldToAnthropic((def as any).innerType);
      return { ...innerType, nullable: true };

    case 'ZodOptional':
      return zodFieldToAnthropic((def as any).innerType);

    case 'ZodRecord':
      return {
        type: 'object',
        additional_properties: true,
      };

    case 'ZodAny':
      return { type: 'object', additional_properties: true };

    default:
      return { type: 'string' }; // Fallback
  }
}

/**
 * Load all MCP tool schemas and convert them to OpenAI/Anthropic formats
 */
export async function loadToolSchemas() {
  // Import all schema modules
  const cardSchemas = await import('../mcp/schemas/card-schemas');
  const graphSchemas = await import('../mcp/schemas/graph-schemas');
  const hierarchySchemas = await import('../mcp/schemas/hierarchy-schemas');
  const recapSchemas = await import('../mcp/schemas/recap-schemas');
  const infoLevelSchemas = await import('../mcp/schemas/info-level-schemas');
  const databaseSchemas = await import('../mcp/schemas/database-schemas');
  const mapSchemas = await import('../mcp/schemas/map-schemas');

  // Combine all schemas
  return {
    ...cardSchemas,
    ...graphSchemas,
    ...hierarchySchemas,
    ...recapSchemas,
    ...infoLevelSchemas,
    ...databaseSchemas,
    ...mapSchemas,
  };
}