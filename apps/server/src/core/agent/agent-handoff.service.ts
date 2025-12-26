import { Injectable } from '@nestjs/common';
import { MCPApiKeyService } from '../../integrations/mcp/services/mcp-api-key.service';
import { AgentMemoryService } from '../agent-memory/agent-memory.service';

@Injectable()
export class AgentHandoffService {
  constructor(
    private readonly apiKeyService: MCPApiKeyService,
    private readonly memoryService: AgentMemoryService,
  ) {}

  async createHandoffKey(
    userId: string,
    workspaceId: string,
    name: string,
  ): Promise<{ apiKey: string; name: string }> {
    const apiKey = await this.apiKeyService.generateApiKey(
      userId,
      workspaceId,
      name,
    );

    await this.memoryService.ingestMemory({
      workspaceId,
      spaceId: null,
      source: 'agent-handoff',
      summary: `External agent key created: ${name}`,
      content: { name },
      tags: ['agent', 'handoff'],
    });

    return { apiKey, name };
  }
}
