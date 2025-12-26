import { Injectable, Logger } from '@nestjs/common';
import { AIService, GeminiGenerateRequest } from '../../ai/ai.service';
import {
  createInternalError,
  createInvalidParamsError,
} from '../utils/error.utils';

/**
 * Handler for AI-related MCP operations
 */
@Injectable()
export class AIHandler {
  private readonly logger = new Logger(AIHandler.name);

  constructor(private readonly aiService: AIService) {}

  /**
   * Handles ai.generate operation
   */
  async generate(params: any): Promise<any> {
    this.logger.debug('Processing ai.generate operation');

    if (!params?.model) {
      throw createInvalidParamsError('model is required');
    }
    if (!params?.contents) {
      throw createInvalidParamsError('contents is required');
    }

    try {
      const request: GeminiGenerateRequest = {
        model: params.model,
        contents: params.contents,
        generationConfig: params.generationConfig,
        safetySettings: params.safetySettings,
        tools: params.tools,
        toolConfig: params.toolConfig,
      };
      return this.aiService.generateContent(request);
    } catch (error: any) {
      this.logger.error(
        `Error generating content: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
