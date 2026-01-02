import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import { User, MCPApiKey } from '@raven-docs/db/types/entity.types';
import { MCPApiKeyService } from '../services/mcp-api-key.service';
import { IsString, MinLength } from 'class-validator';
import WorkspaceAbilityFactory from '../../../core/casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslSubject,
  WorkspaceCaslAction,
} from '../../../core/casl/interfaces/workspace-ability.type';
import { UserService } from '../../../core/user/user.service';
import { EnvironmentService } from '../../../integrations/environment/environment.service';

class CreateApiKeyDto {
  @IsString()
  @MinLength(3)
  name: string;
}

class RegisterApiKeyDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  userId: string;

  @IsString()
  workspaceId: string;
}

@Controller('api-keys')
export class ApiKeyController {
  constructor(
    private readonly mcpApiKeyService: MCPApiKeyService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
    private readonly userService: UserService,
    private readonly environmentService: EnvironmentService,
  ) {}

  /**
   * Create a new API key - requires authentication
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createApiKey(@Body() dto: CreateApiKeyDto, @AuthUser() user: User) {
    if (!user.workspaceId) {
      throw new BadRequestException('User must be associated with a workspace');
    }

    // Check if user has permission to create API keys
    const ability = this.workspaceAbility.createForUser(user, {
      id: user.workspaceId,
    } as any);
    if (
      !ability.can(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new BadRequestException(
        'You do not have permission to create API keys',
      );
    }

    const apiKey = await this.mcpApiKeyService.generateApiKey(
      user.id,
      user.workspaceId,
      dto.name,
    );

    return {
      key: apiKey,
      message:
        'API key created successfully. This is the only time the key will be shown.',
    };
  }

  /**
   * Create a registration API key - requires registration token from .env
   * This endpoint is used for registering new API clients without requiring a user to be logged in
   */
  @Post('register')
  async registerApiKey(
    @Body() dto: RegisterApiKeyDto,
    @Headers('x-registration-token') registrationToken: string,
  ) {
    // Validate registration token from environment
    const appSecret = this.environmentService.getAppSecret();
    if (!registrationToken || registrationToken !== appSecret) {
      throw new UnauthorizedException('Invalid registration token');
    }

    // Verify the user exists and belongs to the workspace
    const user = await this.userService.findById(dto.userId, dto.workspaceId);
    if (!user) {
      throw new BadRequestException('User or workspace not found');
    }

    const apiKey = await this.mcpApiKeyService.generateApiKey(
      dto.userId,
      dto.workspaceId,
      dto.name,
    );

    return {
      key: apiKey,
      message: 'Registration API key created successfully.',
    };
  }

  /**
   * List API keys for the current user
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async listApiKeys(@AuthUser() user: User): Promise<{ keys: MCPApiKey[] }> {
    if (!user.workspaceId) {
      throw new BadRequestException('User must be associated with a workspace');
    }

    const keys = await this.mcpApiKeyService.listApiKeys(user.id);
    return { keys };
  }

  /**
   * Revoke an API key
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async revokeApiKey(@Param('id') id: string, @AuthUser() user: User) {
    if (!user.workspaceId) {
      throw new BadRequestException('User must be associated with a workspace');
    }

    const success = await this.mcpApiKeyService.revokeApiKey(id, user.id);

    if (!success) {
      throw new NotFoundException(
        'API key not found or you do not have permission to revoke it',
      );
    }

    return { message: 'API key revoked successfully' };
  }
}
