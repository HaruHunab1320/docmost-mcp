import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export const AuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const authUser = request?.user?.user ?? request?.user;
    if (!authUser) {
      throw new BadRequestException('Invalid User');
    }

    return authUser;
  },
);
