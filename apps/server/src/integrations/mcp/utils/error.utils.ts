import { MCPError } from '../interfaces/mcp.interface';

/**
 * JSON-RPC 2.0 standard error codes
 */
export enum MCPErrorCode {
  // JSON-RPC 2.0 standard error codes
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // Server error codes (reserved -32000 to -32099)
  SERVER_ERROR = -32000,

  // Application-specific error codes
  RESOURCE_NOT_FOUND = -32001,
  PERMISSION_DENIED = -32002,
  VALIDATION_ERROR = -32003,
  RESOURCE_EXISTS = -32004,
  APPROVAL_REQUIRED = -32005,
}

/**
 * Create an MCP error object
 *
 * @param code The error code
 * @param message The error message
 * @param data Additional error data
 * @returns The MCP error object
 */
export function createMCPError(
  code: number,
  message: string,
  data?: any,
): MCPError {
  return {
    code,
    message,
    data,
  };
}

/**
 * Create a parse error
 *
 * @param details Error details
 * @returns The MCP error object
 */
export function createParseError(details?: any): MCPError {
  return createMCPError(MCPErrorCode.PARSE_ERROR, 'Parse error', details);
}

/**
 * Create an invalid request error
 *
 * @param details Error details
 * @returns The MCP error object
 */
export function createInvalidRequestError(details?: any): MCPError {
  return createMCPError(
    MCPErrorCode.INVALID_REQUEST,
    'Invalid request',
    details,
  );
}

/**
 * Create a method not found error
 *
 * @param method The method that was not found
 * @returns The MCP error object
 */
export function createMethodNotFoundError(method?: string): MCPError {
  return createMCPError(
    MCPErrorCode.METHOD_NOT_FOUND,
    'Method not found',
    method ? `Method '${method}' not found` : undefined,
  );
}

/**
 * Create an invalid params error
 *
 * @param details Error details
 * @returns The MCP error object
 */
export function createInvalidParamsError(details?: any): MCPError {
  return createMCPError(MCPErrorCode.INVALID_PARAMS, 'Invalid params', details);
}

/**
 * Create an internal error
 *
 * @param details Error details
 * @returns The MCP error object
 */
export function createInternalError(details?: any): MCPError {
  return createMCPError(MCPErrorCode.INTERNAL_ERROR, 'Internal error', details);
}

/**
 * Create a resource not found error
 *
 * @param resourceType The type of resource that was not found
 * @param resourceId The id of the resource that was not found
 * @returns The MCP error object
 */
export function createResourceNotFoundError(
  resourceType: string,
  resourceId?: string,
): MCPError {
  return createMCPError(
    MCPErrorCode.RESOURCE_NOT_FOUND,
    `${resourceType} not found`,
    resourceId
      ? `${resourceType} with id '${resourceId}' not found`
      : undefined,
  );
}

/**
 * Create a permission denied error
 *
 * @param details Error details
 * @returns The MCP error object
 */
export function createPermissionDeniedError(details?: any): MCPError {
  return createMCPError(
    MCPErrorCode.PERMISSION_DENIED,
    'Permission denied',
    details,
  );
}

/**
 * Create an approval required error
 *
 * @param details Error details
 * @returns The MCP error object
 */
export function createApprovalRequiredError(details?: any): MCPError {
  return createMCPError(
    MCPErrorCode.APPROVAL_REQUIRED,
    'Approval required',
    details,
  );
}
