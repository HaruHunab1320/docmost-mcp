/**
 * Machine Control Protocol (MCP) Event Interface
 *
 * This file defines the interfaces for real-time MCP events sent over WebSockets
 */

/**
 * Base interface for all MCP events
 */
export interface MCPEvent {
  /**
   * Event type
   */
  type: MCPEventType;

  /**
   * Resource type that was modified
   */
  resource: MCPResourceType;

  /**
   * Operation performed on the resource
   */
  operation: MCPOperationType;

  /**
   * Resource ID that was modified
   */
  resourceId: string;

  /**
   * Timestamp of when the event occurred
   */
  timestamp: string;

  /**
   * Data associated with the event
   */
  data?: any;

  /**
   * User ID of who triggered the event
   */
  userId: string;

  /**
   * Workspace ID where the event occurred
   */
  workspaceId: string;

  /**
   * Space ID where the event occurred (if applicable)
   */
  spaceId?: string;
}

/**
 * Types of MCP events
 */
export enum MCPEventType {
  /**
   * Resource was created
   */
  CREATED = 'created',

  /**
   * Resource was updated
   */
  UPDATED = 'updated',

  /**
   * Resource was deleted
   */
  DELETED = 'deleted',

  /**
   * Resource was moved (e.g., between spaces)
   */
  MOVED = 'moved',

  /**
   * Permission changes on a resource
   */
  PERMISSION_CHANGED = 'permission_changed',

  /**
   * User presence update
   */
  PRESENCE = 'presence',

  /**
   * Navigation event
   */
  NAVIGATION = 'navigation',
}

/**
 * Types of resources that can be modified
 */
export enum MCPResourceType {
  PAGE = 'page',
  SPACE = 'space',
  WORKSPACE = 'workspace',
  USER = 'user',
  GROUP = 'group',
  ATTACHMENT = 'attachment',
  COMMENT = 'comment',
  PROJECT = 'project',
  TASK = 'task',
  UI = 'ui',
}

/**
 * Types of operations that can be performed
 */
export enum MCPOperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move',
  ADD_MEMBER = 'add_member',
  REMOVE_MEMBER = 'remove_member',
  NAVIGATE = 'navigate',
}

/**
 * Page event data
 */
export interface PageEventData {
  title?: string;
  parentPageId?: string;
  content?: any;
}

/**
 * Comment event data
 */
export interface CommentEventData {
  content?: any;
  pageId?: string;
  parentCommentId?: string;
}

/**
 * User presence event data
 */
export interface PresenceEventData {
  pageId: string;
  status: 'online' | 'offline' | 'idle';
  lastActive: string;
  cursorPosition?: {
    x: number;
    y: number;
  };
}
