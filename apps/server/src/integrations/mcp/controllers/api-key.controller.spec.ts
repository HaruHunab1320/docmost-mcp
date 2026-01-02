import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyController } from './api-key.controller';
import { MCPApiKeyService } from '../services/mcp-api-key.service';
import WorkspaceAbilityFactory from '../../../core/casl/abilities/workspace-ability.factory';
import { UserService } from '../../../core/user/user.service';
import { EnvironmentService } from '../../../integrations/environment/environment.service';
import { User, MCPApiKey } from '@raven-docs/db/types/entity.types';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  WorkspaceCaslSubject,
  WorkspaceCaslAction,
} from '../../../core/casl/interfaces/workspace-ability.type';

describe('ApiKeyController', () => {
  let controller: ApiKeyController;
  let mcpApiKeyService: MCPApiKeyService;
  let workspaceAbilityFactory: WorkspaceAbilityFactory;
  let userService: UserService;
  let environmentService: EnvironmentService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    workspaceId: 'workspace-123',
    name: 'Test User',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockMCPApiKeyService = {
    generateApiKey: jest.fn(),
    listApiKeys: jest.fn(),
    revokeApiKey: jest.fn(),
  };

  const mockWorkspaceAbility = {
    can: jest.fn(),
  };

  const mockWorkspaceAbilityFactory = {
    createForUser: jest.fn().mockReturnValue(mockWorkspaceAbility),
  };

  const mockUserService = {
    findById: jest.fn(),
  };

  const mockEnvironmentService = {
    getAppSecret: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyController],
      providers: [
        {
          provide: MCPApiKeyService,
          useValue: mockMCPApiKeyService,
        },
        {
          provide: WorkspaceAbilityFactory,
          useValue: mockWorkspaceAbilityFactory,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: EnvironmentService,
          useValue: mockEnvironmentService,
        },
      ],
    }).compile();

    controller = module.get<ApiKeyController>(ApiKeyController);
    mcpApiKeyService = module.get<MCPApiKeyService>(MCPApiKeyService);
    workspaceAbilityFactory = module.get<WorkspaceAbilityFactory>(WorkspaceAbilityFactory);
    userService = module.get<UserService>(UserService);
    environmentService = module.get<EnvironmentService>(EnvironmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createApiKey', () => {
    it('should create an API key for authorized user', async () => {
      const dto = { name: 'Test API Key' };
      const generatedKey = 'mcp_1234567890abcdef';

      mockWorkspaceAbility.can.mockReturnValue(true);
      mockMCPApiKeyService.generateApiKey.mockResolvedValue(generatedKey);

      const result = await controller.createApiKey(dto, mockUser);

      expect(result).toEqual({
        key: generatedKey,
        message: 'API key created successfully. This is the only time the key will be shown.',
      });
      expect(mockMCPApiKeyService.generateApiKey).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.workspaceId,
        dto.name,
      );
    });

    it('should throw error if user has no workspace', async () => {
      const dto = { name: 'Test API Key' };
      const userWithoutWorkspace = { ...mockUser, workspaceId: null };

      await expect(
        controller.createApiKey(dto, userWithoutWorkspace as User),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if user lacks permission', async () => {
      const dto = { name: 'Test API Key' };
      mockWorkspaceAbility.can.mockReturnValue(false);

      await expect(
        controller.createApiKey(dto, mockUser),
      ).rejects.toThrow(BadRequestException);

      expect(mockWorkspaceAbility.can).toHaveBeenCalledWith(
        WorkspaceCaslAction.Manage,
        WorkspaceCaslSubject.Settings,
      );
    });
  });

  describe('registerApiKey', () => {
    const validToken = 'secret-token-123';
    const dto = {
      name: 'External API Client',
      userId: 'user-456',
      workspaceId: 'workspace-456',
    };

    beforeEach(() => {
      mockEnvironmentService.getAppSecret.mockReturnValue(validToken);
    });

    it('should register API key with valid registration token', async () => {
      const generatedKey = 'mcp_external_key_123';
      mockUserService.findById.mockResolvedValue({ id: dto.userId });
      mockMCPApiKeyService.generateApiKey.mockResolvedValue(generatedKey);

      const result = await controller.registerApiKey(dto, validToken);

      expect(result).toEqual({
        key: generatedKey,
        message: 'Registration API key created successfully.',
      });
      expect(mockUserService.findById).toHaveBeenCalledWith(dto.userId, dto.workspaceId);
      expect(mockMCPApiKeyService.generateApiKey).toHaveBeenCalledWith(
        dto.userId,
        dto.workspaceId,
        dto.name,
      );
    });

    it('should throw UnauthorizedException with invalid token', async () => {
      await expect(
        controller.registerApiKey(dto, 'wrong-token'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUserService.findById).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with missing token', async () => {
      await expect(
        controller.registerApiKey(dto, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(
        controller.registerApiKey(dto, validToken),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listApiKeys', () => {
    it('should list API keys for user', async () => {
      const mockKeys: MCPApiKey[] = [
        {
          id: 'key-1',
          name: 'Test Key 1',
          userId: mockUser.id,
          workspaceId: mockUser.workspaceId,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUsedAt: null,
        } as MCPApiKey,
        {
          id: 'key-2',
          name: 'Test Key 2',
          userId: mockUser.id,
          workspaceId: mockUser.workspaceId,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUsedAt: new Date(),
        } as MCPApiKey,
      ];

      mockMCPApiKeyService.listApiKeys.mockResolvedValue(mockKeys);

      const result = await controller.listApiKeys(mockUser);

      expect(result).toEqual({ keys: mockKeys });
      expect(mockMCPApiKeyService.listApiKeys).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw error if user has no workspace', async () => {
      const userWithoutWorkspace = { ...mockUser, workspaceId: null };

      await expect(
        controller.listApiKeys(userWithoutWorkspace as User),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return empty array when no keys exist', async () => {
      mockMCPApiKeyService.listApiKeys.mockResolvedValue([]);

      const result = await controller.listApiKeys(mockUser);

      expect(result).toEqual({ keys: [] });
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key successfully', async () => {
      const keyId = 'key-123';
      mockMCPApiKeyService.revokeApiKey.mockResolvedValue(true);

      const result = await controller.revokeApiKey(keyId, mockUser);

      expect(result).toEqual({ message: 'API key revoked successfully' });
      expect(mockMCPApiKeyService.revokeApiKey).toHaveBeenCalledWith(keyId, mockUser.id);
    });

    it('should throw error if user has no workspace', async () => {
      const userWithoutWorkspace = { ...mockUser, workspaceId: null };

      await expect(
        controller.revokeApiKey('key-123', userWithoutWorkspace as User),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if key not found', async () => {
      const keyId = 'non-existent-key';
      mockMCPApiKeyService.revokeApiKey.mockResolvedValue(false);

      await expect(
        controller.revokeApiKey(keyId, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user lacks permission', async () => {
      const keyId = 'other-users-key';
      mockMCPApiKeyService.revokeApiKey.mockResolvedValue(false);

      await expect(
        controller.revokeApiKey(keyId, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});