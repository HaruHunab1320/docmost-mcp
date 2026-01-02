import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentRepo } from '../../database/repos/comment/comment.repo';
import { Comment, User } from '@raven-docs/db/types/entity.types';
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import { PaginationResult } from '@raven-docs/db/pagination/pagination';
import { PageRepo } from '../../database/repos/page/page.repo';
import { AgentMemoryService } from '../agent-memory/agent-memory.service';

@Injectable()
export class CommentService {
  constructor(
    private commentRepo: CommentRepo,
    private pageRepo: PageRepo,
    private readonly agentMemoryService: AgentMemoryService,
  ) {}

  async findById(commentId: string) {
    const comment = await this.commentRepo.findById(commentId, {
      includeCreator: true,
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async create(
    userId: string,
    pageId: string,
    workspaceId: string,
    createCommentDto: CreateCommentDto,
  ) {
    const commentContent = JSON.parse(createCommentDto.content);

    if (createCommentDto.parentCommentId) {
      const parentComment = await this.commentRepo.findById(
        createCommentDto.parentCommentId,
      );

      if (!parentComment || parentComment.pageId !== pageId) {
        throw new BadRequestException('Parent comment not found');
      }

      if (parentComment.parentCommentId !== null) {
        throw new BadRequestException('You cannot reply to a reply');
      }
    }

    const createdComment = await this.commentRepo.insertComment({
      pageId: pageId,
      content: commentContent,
      selection: createCommentDto?.selection?.substring(0, 250),
      type: 'inline',
      parentCommentId: createCommentDto?.parentCommentId,
      creatorId: userId,
      workspaceId: workspaceId,
    });

    try {
      const page = await this.pageRepo.findById(pageId);
      await this.agentMemoryService.ingestMemory({
        workspaceId,
        spaceId: page?.spaceId,
        creatorId: userId,
        source: 'comment.created',
        summary: 'Comment added',
        tags: ['comment', 'created'],
        content: {
          action: 'created',
          commentId: createdComment.id,
          pageId,
          selection: createCommentDto?.selection?.substring(0, 250) || null,
        },
      });
    } catch {
      // Memory ingestion should not block comment creation.
    }

    return createdComment;
  }

  async findByPageId(
    pageId: string,
    pagination: PaginationOptions,
  ): Promise<PaginationResult<Comment>> {
    const page = await this.pageRepo.findById(pageId);

    if (!page) {
      throw new BadRequestException('Page not found');
    }

    const pageComments = await this.commentRepo.findPageComments(
      pageId,
      pagination,
    );

    return pageComments;
  }

  async update(
    commentId: string,
    updateCommentDto: UpdateCommentDto,
    authUser: User,
  ): Promise<Comment> {
    const commentContent = JSON.parse(updateCommentDto.content);

    const comment = await this.commentRepo.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.creatorId !== authUser.id) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const editedAt = new Date();

    await this.commentRepo.updateComment(
      {
        content: commentContent,
        editedAt: editedAt,
      },
      commentId,
    );
    comment.content = commentContent;
    comment.editedAt = editedAt;

    try {
      const page = await this.pageRepo.findById(comment.pageId);
      await this.agentMemoryService.ingestMemory({
        workspaceId: comment.workspaceId,
        spaceId: page?.spaceId,
        creatorId: authUser.id,
        source: 'comment.updated',
        summary: 'Comment updated',
        tags: ['comment', 'updated'],
        content: {
          action: 'updated',
          commentId: comment.id,
          pageId: comment.pageId,
        },
      });
    } catch {
      // Memory ingestion should not block comment updates.
    }

    return comment;
  }

  async remove(commentId: string, authUser: User): Promise<void> {
    const comment = await this.commentRepo.findById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.creatorId !== authUser.id) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepo.deleteComment(commentId);

    try {
      const page = await this.pageRepo.findById(comment.pageId);
      await this.agentMemoryService.ingestMemory({
        workspaceId: comment.workspaceId,
        spaceId: page?.spaceId,
        creatorId: authUser.id,
        source: 'comment.deleted',
        summary: 'Comment deleted',
        tags: ['comment', 'deleted'],
        content: {
          action: 'deleted',
          commentId: comment.id,
          pageId: comment.pageId,
        },
      });
    } catch {
      // Memory ingestion should not block comment deletes.
    }
  }

  async resolve(
    commentId: string,
    resolved: boolean,
    userId: string,
  ): Promise<Comment> {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const resolvedAt = resolved ? new Date() : null;

    await this.commentRepo.updateComment({ resolvedAt }, commentId);

    try {
      const page = await this.pageRepo.findById(comment.pageId);
      await this.agentMemoryService.ingestMemory({
        workspaceId: comment.workspaceId,
        spaceId: page?.spaceId,
        creatorId: userId,
        source: resolved ? 'comment.resolved' : 'comment.unresolved',
        summary: resolved ? 'Comment resolved' : 'Comment reopened',
        tags: ['comment', resolved ? 'resolved' : 'reopened'],
        content: {
          action: resolved ? 'resolved' : 'reopened',
          commentId: comment.id,
          pageId: comment.pageId,
        },
      });
    } catch {
      // Memory ingestion should not block comment resolution updates.
    }

    return {
      ...comment,
      resolvedAt,
    };
  }
}
