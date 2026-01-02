import { Test, TestingModule } from '@nestjs/testing';
import { PageHandler } from './page.handler';
import { PageService } from '../../../core/page/page.service';
import { PageHistoryService } from '../../../core/page/services/page-history.service';
import { MCPEventService } from '../services/mcp-event.service';
import { MCPContextService } from '../services/mcp-context.service';
import { User } from '@raven-docs/db/types/entity.types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PageHandler', () => {
  let handler: PageHandler;
  let pageService: PageService;
  let pageHistoryService: PageHistoryService;
  let mcpEventService: MCPEventService;
  let mcpContextService: MCPContextService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    workspaceId: 'workspace-123',
    name: 'Test User',
    role: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockPageService = {
    getPagesInSpace: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deletePage: jest.fn(),
    searchPages: jest.fn(),
    movePage: jest.fn(),
    duplicatePage: jest.fn(),
    exportPage: jest.fn(),
  };

  const mockPageHistoryService = {
    getPageHistory: jest.fn(),
    getPageHistoryItem: jest.fn(),
    restorePageHistory: jest.fn(),
  };

  const mockMCPEventService = {
    emitPageEvent: jest.fn(),
  };

  const mockMCPContextService = {
    setContext: jest.fn(),
    getContext: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageHandler,
        {
          provide: PageService,
          useValue: mockPageService,
        },
        {
          provide: PageHistoryService,
          useValue: mockPageHistoryService,
        },
        {
          provide: MCPEventService,
          useValue: mockMCPEventService,
        },
        {
          provide: MCPContextService,
          useValue: mockMCPContextService,
        },
      ],
    }).compile();

    handler = module.get<PageHandler>(PageHandler);
    pageService = module.get<PageService>(PageService);
    pageHistoryService = module.get<PageHistoryService>(PageHistoryService);
    mcpEventService = module.get<MCPEventService>(MCPEventService);
    mcpContextService = module.get<MCPContextService>(MCPContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('list', () => {
    it('should list pages in a space', async () => {
      const params = { spaceId: 'space-123', limit: 10, offset: 0 };
      const mockPages = {
        items: [
          { id: 'page-1', title: 'Page 1', spaceId: 'space-123' },
          { id: 'page-2', title: 'Page 2', spaceId: 'space-123' },
        ],
        total: 2,
      };

      mockPageService.getPagesInSpace.mockResolvedValue(mockPages);

      const result = await handler.list(params, mockUser);

      expect(result).toEqual({
        pages: mockPages.items,
        total: mockPages.total,
        hasMore: false,
      });
      expect(mockPageService.getPagesInSpace).toHaveBeenCalledWith(
        'space-123',
        mockUser,
        { limit: 10, offset: 0 },
      );
    });

    it('should handle pagination correctly', async () => {
      const params = { spaceId: 'space-123', limit: 2, offset: 0 };
      const mockPages = {
        items: [
          { id: 'page-1', title: 'Page 1' },
          { id: 'page-2', title: 'Page 2' },
        ],
        total: 5,
      };

      mockPageService.getPagesInSpace.mockResolvedValue(mockPages);

      const result = await handler.list(params, mockUser);

      expect(result.hasMore).toBe(true);
    });

    it('should use default pagination values', async () => {
      const params = { spaceId: 'space-123' };
      mockPageService.getPagesInSpace.mockResolvedValue({ items: [], total: 0 });

      await handler.list(params, mockUser);

      expect(mockPageService.getPagesInSpace).toHaveBeenCalledWith(
        'space-123',
        mockUser,
        { limit: 50, offset: 0 },
      );
    });
  });

  describe('get', () => {
    it('should get a page by id', async () => {
      const params = { pageId: 'page-123' };
      const mockPage = {
        id: 'page-123',
        title: 'Test Page',
        content: 'Test content',
        spaceId: 'space-123',
      };

      mockPageService.findById.mockResolvedValue(mockPage);

      const result = await handler.get(params, mockUser);

      expect(result).toEqual({ page: mockPage });
      expect(mockPageService.findById).toHaveBeenCalledWith('page-123', mockUser);
      expect(mockMCPContextService.setContext).toHaveBeenCalledWith('currentPage', mockPage);
    });

    it('should throw NotFoundException when page not found', async () => {
      const params = { pageId: 'non-existent' };
      mockPageService.findById.mockResolvedValue(null);

      await expect(handler.get(params, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new page', async () => {
      const params = {
        title: 'New Page',
        content: 'Page content',
        spaceId: 'space-123',
        parentPageId: 'parent-123',
      };
      const mockCreatedPage = {
        id: 'new-page-123',
        ...params,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPageService.create.mockResolvedValue(mockCreatedPage);

      const result = await handler.create(params, mockUser);

      expect(result).toEqual({ page: mockCreatedPage });
      expect(mockPageService.create).toHaveBeenCalledWith(
        {
          title: params.title,
          markdown: params.content,
          spaceId: params.spaceId,
          parentPageId: params.parentPageId,
        },
        mockUser,
      );
      expect(mockMCPEventService.emitPageEvent).toHaveBeenCalledWith(
        'page.created',
        mockCreatedPage,
        mockUser,
      );
      expect(mockMCPContextService.setContext).toHaveBeenCalledWith('lastCreatedPage', mockCreatedPage);
    });

    it('should create page without optional fields', async () => {
      const params = { title: 'Minimal Page' };
      const mockCreatedPage = {
        id: 'new-page-123',
        title: params.title,
        content: '',
        spaceId: null,
        parentPageId: null,
      };

      mockPageService.create.mockResolvedValue(mockCreatedPage);

      const result = await handler.create(params, mockUser);

      expect(result).toEqual({ page: mockCreatedPage });
      expect(mockPageService.create).toHaveBeenCalledWith(
        {
          title: params.title,
          markdown: undefined,
          spaceId: undefined,
          parentPageId: undefined,
        },
        mockUser,
      );
    });
  });

  describe('update', () => {
    it('should update a page', async () => {
      const params = {
        pageId: 'page-123',
        title: 'Updated Title',
        content: 'Updated content',
      };
      const mockUpdatedPage = {
        id: 'page-123',
        title: params.title,
        content: params.content,
        updatedAt: new Date(),
      };

      mockPageService.update.mockResolvedValue(mockUpdatedPage);

      const result = await handler.update(params, mockUser);

      expect(result).toEqual({ page: mockUpdatedPage });
      expect(mockPageService.update).toHaveBeenCalledWith(
        params.pageId,
        {
          title: params.title,
          markdown: params.content,
        },
        mockUser,
      );
      expect(mockMCPEventService.emitPageEvent).toHaveBeenCalledWith(
        'page.updated',
        mockUpdatedPage,
        mockUser,
      );
    });

    it('should handle partial updates', async () => {
      const params = { pageId: 'page-123', title: 'Only Title Update' };
      mockPageService.update.mockResolvedValue({ id: 'page-123', title: params.title });

      await handler.update(params, mockUser);

      expect(mockPageService.update).toHaveBeenCalledWith(
        params.pageId,
        {
          title: params.title,
          markdown: undefined,
        },
        mockUser,
      );
    });
  });

  describe('delete', () => {
    it('should delete a page', async () => {
      const params = { pageId: 'page-123' };

      mockPageService.deletePage.mockResolvedValue(undefined);

      const result = await handler.delete(params, mockUser);

      expect(result).toEqual({ success: true });
      expect(mockPageService.deletePage).toHaveBeenCalledWith('page-123', mockUser);
      expect(mockMCPEventService.emitPageEvent).toHaveBeenCalledWith(
        'page.deleted',
        { pageId: 'page-123' },
        mockUser,
      );
    });

    it('should handle deletion errors', async () => {
      const params = { pageId: 'page-123' };
      mockPageService.deletePage.mockRejectedValue(new ForbiddenException());

      await expect(handler.delete(params, mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('search', () => {
    it('should search pages', async () => {
      const params = { query: 'test search', spaceId: 'space-123' };
      const mockSearchResults = [
        { id: 'page-1', title: 'Test Page 1', snippet: 'test content' },
        { id: 'page-2', title: 'Test Page 2', snippet: 'test content' },
      ];

      mockPageService.searchPages.mockResolvedValue(mockSearchResults);

      const result = await handler.search(params, mockUser);

      expect(result).toEqual({ results: mockSearchResults });
      expect(mockPageService.searchPages).toHaveBeenCalledWith(
        params.query,
        mockUser,
        { spaceId: params.spaceId },
      );
    });

    it('should search without space filter', async () => {
      const params = { query: 'global search' };
      mockPageService.searchPages.mockResolvedValue([]);

      await handler.search(params, mockUser);

      expect(mockPageService.searchPages).toHaveBeenCalledWith(
        params.query,
        mockUser,
        {},
      );
    });
  });

  describe('move', () => {
    it('should move a page', async () => {
      const params = {
        pageId: 'page-123',
        targetSpaceId: 'space-456',
        targetParentId: 'parent-456',
      };
      const mockMovedPage = {
        id: 'page-123',
        spaceId: 'space-456',
        parentPageId: 'parent-456',
      };

      mockPageService.movePage.mockResolvedValue(mockMovedPage);

      const result = await handler.move(params, mockUser);

      expect(result).toEqual({ page: mockMovedPage });
      expect(mockPageService.movePage).toHaveBeenCalledWith(
        params.pageId,
        params.targetSpaceId,
        params.targetParentId,
        mockUser,
      );
      expect(mockMCPEventService.emitPageEvent).toHaveBeenCalledWith(
        'page.moved',
        mockMovedPage,
        mockUser,
      );
    });
  });

  describe('duplicate', () => {
    it('should duplicate a page', async () => {
      const params = { pageId: 'page-123', includeChildren: true };
      const mockDuplicatedPage = {
        id: 'page-copy-123',
        title: 'Test Page (Copy)',
        content: 'Test content',
      };

      mockPageService.duplicatePage.mockResolvedValue(mockDuplicatedPage);

      const result = await handler.duplicate(params, mockUser);

      expect(result).toEqual({ page: mockDuplicatedPage });
      expect(mockPageService.duplicatePage).toHaveBeenCalledWith(
        params.pageId,
        params.includeChildren,
        mockUser,
      );
      expect(mockMCPEventService.emitPageEvent).toHaveBeenCalledWith(
        'page.duplicated',
        mockDuplicatedPage,
        mockUser,
      );
    });

    it('should duplicate without children by default', async () => {
      const params = { pageId: 'page-123' };
      mockPageService.duplicatePage.mockResolvedValue({ id: 'page-copy-123' });

      await handler.duplicate(params, mockUser);

      expect(mockPageService.duplicatePage).toHaveBeenCalledWith(
        params.pageId,
        false,
        mockUser,
      );
    });
  });
});