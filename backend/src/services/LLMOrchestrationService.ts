/**
 * LLM Orchestration Service
 * Feature: 005-create-the-ai
 * Handles streaming, function calling loop, and error handling for OpenAI/Anthropic
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Response } from 'express';

/**
 * Base configuration for LLM providers
 */
interface LLMConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Function definition for LLM
 */
interface FunctionDefinition {
  name: string;
  description: string;
  parameters: any; // JSON Schema
}

/**
 * Chat message format
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string; // For function responses
  function_call?: {
    name: string;
    arguments: string;
  };
}

/**
 * LLM Orchestration Service
 * Handles streaming setup, function calling loop, and error handling
 */
export class LLMOrchestrationService {
  private openAIClient?: OpenAI;
  private anthropicClient?: Anthropic;

  constructor(private config: LLMConfig) {
    if (config.provider === 'openai') {
      this.openAIClient = new OpenAI({
        apiKey: config.apiKey,
      });
    } else if (config.provider === 'anthropic') {
      this.anthropicClient = new Anthropic({
        apiKey: config.apiKey,
      });
    }
  }

  /**
   * Stream a chat completion with function calling support
   * Reference: research.md lines 87-357
   */
  async *streamChatCompletion(
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    functionHandler: (name: string, params: any) => Promise<any>
  ): AsyncGenerator<string, void, unknown> {
    if (this.config.provider === 'openai') {
      yield* this.streamOpenAI(messages, functions, functionHandler);
    } else if (this.config.provider === 'anthropic') {
      yield* this.streamAnthropic(messages, functions, functionHandler);
    } else {
      throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * Stream with OpenAI
   */
  private async *streamOpenAI(
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    functionHandler: (name: string, params: any) => Promise<any>
  ): AsyncGenerator<string, void, unknown> {
    if (!this.openAIClient) {
      throw new Error('OpenAI client not initialized');
    }

    let retries = 0;
    const maxRetries = 3;
    let backoffMs = 1000;

    while (retries < maxRetries) {
      try {
        const stream = await this.openAIClient.chat.completions.create({
          model: this.config.model,
          messages: messages as any,
          functions: functions.length > 0 ? functions : undefined,
          function_call: functions.length > 0 ? 'auto' : undefined,
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 2000,
          stream: true,
        });

        let functionCallInProgress: any = null;
        let functionCallName = '';
        let functionCallArguments = '';

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;

          if (delta?.function_call) {
            if (delta.function_call.name) {
              functionCallName = delta.function_call.name;
              functionCallInProgress = { name: functionCallName, arguments: '' };
            }
            if (delta.function_call.arguments) {
              functionCallArguments += delta.function_call.arguments;
              functionCallInProgress.arguments = functionCallArguments;
            }
          }

          // If we have content, yield it
          if (delta?.content) {
            yield delta.content;
          }

          // Check if we've completed a function call
          if (chunk.choices[0]?.finish_reason === 'function_call' && functionCallInProgress) {
            try {
              // Parse and execute the function
              const args = JSON.parse(functionCallArguments);
              const result = await functionHandler(functionCallName, args);

              // Add function result to messages
              messages.push({
                role: 'assistant',
                content: '',
                function_call: {
                  name: functionCallName,
                  arguments: functionCallArguments,
                },
              });
              messages.push({
                role: 'function',
                name: functionCallName,
                content: JSON.stringify(result),
              });

              // Continue the conversation with the function result
              yield* this.streamOpenAI(messages, functions, functionHandler);
            } catch (error) {
              yield `Error calling function ${functionCallName}: ${error}`;
            }
            return;
          }
        }

        return; // Success, exit retry loop
      } catch (error: any) {
        retries++;
        if (error?.status === 429 && retries < maxRetries) {
          // Rate limit - exponential backoff with jitter
          const jitter = Math.random() * 200;
          await this.delay(backoffMs + jitter);
          backoffMs *= 2;
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Stream with Anthropic
   */
  private async *streamAnthropic(
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    functionHandler: (name: string, params: any) => Promise<any>
  ): AsyncGenerator<string, void, unknown> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    let retries = 0;
    const maxRetries = 3;
    let backoffMs = 1000;

    // Convert functions to Anthropic tool format
    const tools = functions.map(fn => ({
      name: fn.name,
      description: fn.description,
      input_schema: fn.parameters,
    }));

    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

    while (retries < maxRetries) {
      try {
        const stream = await this.anthropicClient.messages.create({
          model: this.config.model,
          system: systemMessage,
          messages: anthropicMessages as any,
          tools: tools.length > 0 ? tools : undefined,
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 2000,
          stream: true,
        });

        let toolUseInProgress: any = null;

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta') {
            if (chunk.delta.type === 'text_delta') {
              yield chunk.delta.text;
            } else if (chunk.delta.type === 'input_json_delta') {
              // Accumulate tool input
              if (toolUseInProgress) {
                toolUseInProgress.input += chunk.delta.partial_json;
              }
            }
          } else if (chunk.type === 'content_block_start') {
            if (chunk.content_block.type === 'tool_use') {
              toolUseInProgress = {
                id: chunk.content_block.id,
                name: chunk.content_block.name,
                input: '',
              };
            }
          } else if (chunk.type === 'content_block_stop') {
            // Execute tool if we have one
            if (toolUseInProgress) {
              try {
                const args = JSON.parse(toolUseInProgress.input);
                const result = await functionHandler(toolUseInProgress.name, args);

                // Add tool result to conversation and continue
                messages.push({
                  role: 'assistant',
                  content: `Called tool: ${toolUseInProgress.name}`,
                });
                messages.push({
                  role: 'user',
                  content: `Tool result: ${JSON.stringify(result)}`,
                });

                // Continue the conversation
                yield* this.streamAnthropic(messages, functions, functionHandler);
              } catch (error) {
                yield `Error calling tool ${toolUseInProgress.name}: ${error}`;
              }
              toolUseInProgress = null;
              return;
            }
          }
        }

        return; // Success, exit retry loop
      } catch (error: any) {
        retries++;
        if (error?.status === 429 && retries < maxRetries) {
          // Rate limit - exponential backoff with jitter
          const jitter = Math.random() * 200;
          await this.delay(backoffMs + jitter);
          backoffMs *= 2;
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Helper for delay with backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stream response to SSE (Server-Sent Events)
   */
  async streamToSSE(
    res: Response,
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    functionHandler: (name: string, params: any) => Promise<any>
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.streamChatCompletion(messages, functions, functionHandler)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
      res.end();
    }
  }
}