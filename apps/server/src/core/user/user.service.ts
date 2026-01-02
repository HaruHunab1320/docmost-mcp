import { UserRepo } from '@raven-docs/db/repos/user/user.repo';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import { PaginationResult } from '@raven-docs/db/pagination/pagination';
import { User } from '@raven-docs/db/types/entity.types';

@Injectable()
export class UserService {
  constructor(private userRepo: UserRepo) {}

  async findById(userId: string, workspaceId: string) {
    const logger = new Logger('UserService');
    logger.debug(
      `UserService: Finding user by ID: ${userId}, workspace: ${workspaceId}`,
    );

    try {
      const user = await this.userRepo.findById(userId, workspaceId);

      if (!user) {
        logger.warn(
          `UserService: User not found - userId: ${userId}, workspaceId: ${workspaceId}`,
        );
        return null;
      }

      if (user.workspaceId !== workspaceId) {
        logger.warn(
          `UserService: User found but workspaceId mismatch - userId: ${userId}, user.workspaceId: ${user.workspaceId}, requested workspaceId: ${workspaceId}`,
        );
      }

      logger.debug(`UserService: User found - ${user.email}`);
      return user;
    } catch (error: any) {
      logger.error(
        `UserService: Error finding user - ${error.message || 'Unknown error'}`,
        error.stack || '',
      );
      if (error.code) {
        logger.error(`UserService: Error code: ${error.code}`);
      }
      if (error.detail) {
        logger.error(`UserService: Error detail: ${error.detail}`);
      }
      return null;
    }
  }

  async getWorkspaceUsers(
    workspaceId: string,
    pagination: PaginationOptions,
  ): Promise<PaginationResult<User>> {
    return this.userRepo.getUsersPaginated(workspaceId, pagination);
  }

  async update(
    updateUserDto: UpdateUserDto,
    userId: string,
    workspaceId: string,
  ) {
    const user = await this.userRepo.findById(userId, workspaceId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // preference updates
    if (typeof updateUserDto.fullPageWidth !== 'undefined') {
      return this.userRepo.updatePreference(
        userId,
        'fullPageWidth',
        updateUserDto.fullPageWidth,
      );
    }

    if (typeof updateUserDto.themeId !== 'undefined') {
      return this.userRepo.updatePreference(
        userId,
        'themeId',
        updateUserDto.themeId,
      );
    }

    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.email && user.email != updateUserDto.email) {
      if (await this.userRepo.findByEmail(updateUserDto.email, workspaceId)) {
        throw new BadRequestException('A user with this email already exists');
      }
      user.email = updateUserDto.email;
    }

    if (updateUserDto.avatarUrl) {
      user.avatarUrl = updateUserDto.avatarUrl;
    }

    if (updateUserDto.locale) {
      user.locale = updateUserDto.locale;
    }

    await this.userRepo.updateUser(updateUserDto, userId, workspaceId);
    return user;
  }
}
