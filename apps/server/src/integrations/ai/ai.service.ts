import { Injectable, Logger } from '@nestjs/common';
import { createInternalError, createInvalidParamsError } from '../mcp/utils/error.utils';

export interface GeminiGenerateRequest {
  model: string;
  contents: any[];
  generationConfig?: Record<string, any>;
  safetySettings?: Array<Record<string, any>>;
  tools?: Array<Record<string, any>>;
  toolConfig?: Record<string, any>;
}

export interface GeminiEmbedRequest {
  model: string;
  content: string;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  private getApiKey(): string | undefined {
    return (
      process.env.GEMINI_API_KEY ||
      process.env.gemini_api_key ||
      process.env.GOOGLE_API_KEY ||
      process.env.google_api_key
    );
  }

  private getAllowedModels(): string[] {
    const env = process.env.GEMINI_ALLOWED_MODELS;
    if (env) {
      return env
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
    return [
      'gemini-3-pro-preview',
      'gemini-3-flash-preview',
      'gemini-2.5-flash-image-preview',
      'gemini-3-pro-image-preview',
    ];
  }

  async generateContent(request: GeminiGenerateRequest): Promise<any> {
    if (!request?.model) {
      throw createInvalidParamsError('model is required');
    }
    if (!request?.contents?.length) {
      throw createInvalidParamsError('contents is required');
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw createInvalidParamsError(
        'GEMINI_API_KEY or GOOGLE_API_KEY is not configured',
      );
    }

    const allowed = this.getAllowedModels();
    if (!allowed.includes(request.model)) {
      throw createInvalidParamsError(
        `model is not allowed: ${request.model}`,
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${apiKey}`;
    const body = {
      contents: request.contents,
      generationConfig: request.generationConfig,
      safetySettings: request.safetySettings,
      tools: request.tools,
      toolConfig: request.toolConfig,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();
      if (!response.ok) {
        this.logger.warn(
          `Gemini API error: ${response.status} ${JSON.stringify(json)}`,
        );
        throw createInternalError(json?.error?.message || 'Gemini API error');
      }
      return json;
    } catch (error: any) {
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      this.logger.error(
        `Gemini API request failed: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw createInternalError(error?.message || String(error));
    }
  }

  async embedContent(request: GeminiEmbedRequest): Promise<{ embedding: number[] }> {
    if (!request?.model) {
      throw createInvalidParamsError('model is required');
    }
    if (!request?.content) {
      throw createInvalidParamsError('content is required');
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw createInvalidParamsError(
        'GEMINI_API_KEY or GOOGLE_API_KEY is not configured',
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:embedContent?key=${apiKey}`;
    const body = {
      content: {
        parts: [{ text: request.content }],
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) {
        this.logger.warn(
          `Gemini embed error: ${response.status} ${JSON.stringify(json)}`,
        );
        throw createInternalError(json?.error?.message || 'Gemini embed error');
      }
      return { embedding: json?.embedding?.values || [] };
    } catch (error: any) {
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      this.logger.error(
        `Gemini embed request failed: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw createInternalError(error?.message || String(error));
    }
  }
}
