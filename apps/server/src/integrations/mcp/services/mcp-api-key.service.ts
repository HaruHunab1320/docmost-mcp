import { Injectable, Logger } from '@nestjs/common';
import { KyselyTransaction } from '@raven-docs/db/types/kysely.types';
import { randomBytes, createHash } from 'crypto';
import { MCPApiKeyRepo } from '../../../database/repos/mcp-api-key/mcp-api-key.repo';
import { MCPApiKey } from '@raven-docs/db/types/entity.types';

/**
 * Service for managing MCP API keys
 */
@Injectable()
export class MCPApiKeyService {
  private readonly logger = new Logger(MCPApiKeyService.name);

  constructor(private readonly mcpApiKeyRepo: MCPApiKeyRepo) {}

  /**
   * Generate a new API key for a user in a workspace
   *
   * @param userId The user ID
   * @param workspaceId The workspace ID
   * @param name A descriptive name for the API key
   * @param trx Optional transaction
   * @returns The generated API key
   */
  async generateApiKey(
    userId: string,
    workspaceId: string,
    name: string,
    trx?: KyselyTransaction,
  ): Promise<string> {
    // Generate a random API key
    const apiKey = `mcp_${randomBytes(32).toString('hex')}`;

    // Hash the API key for storage
    const hashedKey = this.hashApiKey(apiKey);

    // Create the API key in the database
    await this.mcpApiKeyRepo.createApiKey({
      userId,
      workspaceId,
      name,
      hashedKey,
    });

    return apiKey;
  }

  /**
   * Validate an API key and return the associated user and workspace IDs
   *
   * @param apiKey The API key to validate
   * @returns The user ID and workspace ID if valid, null otherwise
   */
  async validateApiKey(
    apiKey: string,
  ): Promise<{ userId: string; workspaceId: string } | null> {
    this.logger.debug(
      `MCPApiKeyService: Validating API key ${apiKey.substring(0, 10)}...`,
    );

    if (!apiKey || !apiKey.startsWith('mcp_')) {
      this.logger.warn('MCPApiKeyService: Invalid API key format');
      return null;
    }

    try {
      const hashedKey = this.hashApiKey(apiKey);
      this.logger.debug(`MCPApiKeyService: Looking up API key by hashed value`);

      const dbKey = await this.mcpApiKeyRepo.getApiKeyByHashedKey(hashedKey);

      if (!dbKey) {
        this.logger.warn(
          `MCPApiKeyService: No API key found with hash ${hashedKey.substring(0, 10)}...`,
        );
        return null;
      }

      this.logger.debug(
        `MCPApiKeyService: API key found in database: ${dbKey.id}, name: ${dbKey.name}`,
      );

      // Update the last used timestamp
      await this.mcpApiKeyRepo.updateLastUsedAt(hashedKey);
      this.logger.debug('MCPApiKeyService: Updated last_used_at timestamp');

      return {
        userId: dbKey.userId,
        workspaceId: dbKey.workspaceId,
      };
    } catch (error: any) {
      this.logger.error(
        `MCPApiKeyService: Error validating API key: ${error.message || 'Unknown error'}`,
        error.stack || '',
      );
      return null;
    }
  }

  /**
   * List all API keys for a user
   *
   * @param userId The user ID
   * @returns Array of API key data
   */
  async listApiKeys(userId: string): Promise<MCPApiKey[]> {
    return this.mcpApiKeyRepo.getApiKeysByUserId(userId);
  }

  /**
   * Revoke an API key
   *
   * @param keyId The API key ID to revoke
   * @param userId The user ID (for validation)
   * @returns Whether the key was successfully revoked
   */
  async revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    return this.mcpApiKeyRepo.deleteApiKey(keyId, userId);
  }

  /**
   * Hash an API key for secure storage
   *
   * @param apiKey The API key to hash
   * @returns The hashed key
   */
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }
}
