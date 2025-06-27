import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that automatically injects workspaceId from the authenticated
 * context into MCP request parameters.
 * 
 * This allows MCP clients to omit the workspaceId parameter since it's
 * already determined by the API key authentication.
 */
@Injectable()
export class WorkspaceInjectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(WorkspaceInjectionMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Only process POST requests with JSON body
    if (req.method === 'POST' && req.body) {
      const workspaceId = req['workspaceId'];
      
      if (workspaceId) {
        this.logger.debug(`Injecting workspaceId ${workspaceId} into MCP request`);
        
        // Handle single request
        if (req.body.params && typeof req.body.params === 'object') {
          // Only inject if not already present
          if (!req.body.params.workspaceId) {
            req.body.params.workspaceId = workspaceId;
          }
        }
        
        // Handle batch requests
        if (Array.isArray(req.body)) {
          req.body.forEach((request: any) => {
            if (request.params && typeof request.params === 'object') {
              if (!request.params.workspaceId) {
                request.params.workspaceId = workspaceId;
              }
            }
          });
        }
      }
    }
    
    next();
  }
}