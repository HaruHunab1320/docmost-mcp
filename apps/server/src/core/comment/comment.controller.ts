import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PageIdDto, CommentIdDto } from './dto/comments.input';
import { ResolveCommentDto } from './dto/resolve-comment.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import { User, Workspace } from '@raven-docs/db/types/entity.types';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import { PageRepo } from '../../database/repos/page/page.repo';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import { CommentRepo } from '../../database/repos/comment/comment.repo';

@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly commentRepo: CommentRepo,
    private readonly pageRepo: PageRepo,
    private readonly spaceAbility: SpaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const page = await this.pageRepo.findById(createCommentDto.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const ability = await this.spaceAbility.createForUser(user, page.spaceId);
    if (ability.cannot(SpaceCaslAction.Create, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    return this.commentService.create(
      user.id,
      page.id,
      workspace.id,
      createCommentDto,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('/')
  async findPageComments(
    @Body() input: PageIdDto,
    @Body()
    pagination: PaginationOptions,
    @AuthUser() user: User,
    //  @AuthWorkspace() workspace: Workspace,
  ) {
    const page = await this.pageRepo.findById(input.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const ability = await this.spaceAbility.createForUser(user, page.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }
    return this.commentService.findByPageId(page.id, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  async findOne(@Body() input: CommentIdDto, @AuthUser() user: User) {
    const comment = await this.commentRepo.findById(input.commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const page = await this.pageRepo.findById(comment.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const ability = await this.spaceAbility.createForUser(user, page.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }
    return comment;
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async update(
    @Body() updateCommentDto: UpdateCommentDto,
    @AuthUser() user: User,
  ) {
    const comment = await this.commentRepo.findById(updateCommentDto.commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const page = await this.pageRepo.findById(comment.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const ability = await this.spaceAbility.createForUser(user, page.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    return this.commentService.update(
      updateCommentDto.commentId,
      updateCommentDto,
      user,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async remove(@Body() input: CommentIdDto, @AuthUser() user: User) {
    const comment = await this.commentRepo.findById(input.commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const page = await this.pageRepo.findById(comment.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const ability = await this.spaceAbility.createForUser(user, page.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    if (comment.creatorId !== user.id) {
      if (
        ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)
      ) {
        throw new ForbiddenException(
          'You can only delete your own comments',
        );
      }
      await this.commentRepo.deleteComment(comment.id);
      return;
    }

    return this.commentService.remove(input.commentId, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resolve')
  async resolve(@Body() input: ResolveCommentDto, @AuthUser() user: User) {
    const comment = await this.commentRepo.findById(input.commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const page = await this.pageRepo.findById(comment.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const ability = await this.spaceAbility.createForUser(user, page.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    if (
      comment.creatorId !== user.id &&
      ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException('You can only resolve your own comments');
    }

    return this.commentService.resolve(
      comment.id,
      input.resolved,
      user.id,
    );
  }
}
