import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectService } from './services/project.service';
import {
  ProjectIdDto,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectListDto,
  ProjectArchiveDto,
} from './dto/project.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, Workspace } from '../../database/types/entity.types';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly spaceAbility: SpaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('/info')
  async getProject(@Body() dto: ProjectIdDto, @AuthUser() user: User) {
    const project = await this.projectService.findById(dto.projectId, {
      includeCreator: true,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const ability = await this.spaceAbility.createForUser(
      user,
      project.spaceId,
    );
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    return project;
  }

  @HttpCode(HttpStatus.OK)
  @Post('/list')
  async listProjects(@Body() dto: ProjectListDto, @AuthUser() user: User) {
    console.log('=== PROJECT LISTING DEBUG ===');
    console.log('ListProjects request from user:', {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
    });
    console.log('List parameters:', dto);

    const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    const { page, limit, ...options } = dto;
    const result = await this.projectService.findBySpaceId(
      dto.spaceId,
      { page, limit },
      {
        includeArchived: options.includeArchived,
        includeCreator: true,
        searchTerm: options.searchTerm,
      },
    );

    console.log('Projects found:', result.data.length);
    if (result.data.length > 0) {
      console.log(
        'First few projects:',
        result.data.slice(0, 3).map((p) => ({
          id: p.id,
          name: p.name,
          description:
            p.description?.substring(0, 20) +
              (p.description?.length > 20 ? '...' : '') || '',
          createdAt: p.createdAt,
        })),
      );
    }

    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Post('/create')
  async createProject(
    @Body() dto: CreateProjectDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    console.log('=== PROJECT CREATION DEBUG ===');
    console.log('Received DTO:', JSON.stringify(dto, null, 2));
    console.log('User:', {
      id: user.id,
      name: user.name,
      email: user.email,
    });
    console.log('Workspace:', {
      id: workspace.id,
      name: workspace.name,
    });

    const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
    if (ability.cannot(SpaceCaslAction.Create, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    console.log('Before service.create call, name:', dto.name);
    const result = await this.projectService.create(user.id, workspace.id, dto);
    console.log(
      'After service.create call, result:',
      JSON.stringify(result, null, 2),
    );
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Post('/create-page')
  async createProjectPage(
    @Body() dto: ProjectIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const project = await this.projectService.findById(dto.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const ability = await this.spaceAbility.createForUser(
      user,
      project.spaceId,
    );
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    return this.projectService.createProjectPage(
      user.id,
      workspace.id,
      project.id,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('/update')
  async updateProject(@Body() dto: UpdateProjectDto, @AuthUser() user: User) {
    console.log('=============================================');
    console.log('ProjectController.updateProject: received dto:', dto);
    console.log('ProjectController.updateProject: user:', {
      id: user.id,
      email: user.email,
      name: user.name,
    });
    console.log('=============================================');

    const project = await this.projectService.findById(dto.projectId);
    if (!project) {
      console.error(`Project not found with ID: ${dto.projectId}`);
      throw new NotFoundException('Project not found');
    }

    const ability = await this.spaceAbility.createForUser(
      user,
      project.spaceId,
    );
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    const { projectId, ...updateData } = dto;
    console.log('ProjectController.updateProject: calling service with:', {
      projectId,
      updateData,
    });

    try {
      const result = await this.projectService.update(projectId, updateData);
      console.log(
        'ProjectController.updateProject: success, returning:',
        result,
      );
      return result;
    } catch (error) {
      console.error('ProjectController.updateProject: error:', error);
      throw error;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('/delete')
  async deleteProject(@Body() dto: ProjectIdDto, @AuthUser() user: User) {
    const project = await this.projectService.findById(dto.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const ability = await this.spaceAbility.createForUser(
      user,
      project.spaceId,
    );
    if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    await this.projectService.delete(dto.projectId);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('/archive')
  async archiveProject(@Body() dto: ProjectArchiveDto, @AuthUser() user: User) {
    const project = await this.projectService.findById(dto.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const ability = await this.spaceAbility.createForUser(
      user,
      project.spaceId,
    );
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    if (dto.isArchived) {
      return this.projectService.archive(dto.projectId);
    } else {
      return this.projectService.unarchive(dto.projectId);
    }
  }
}
