#!/usr/bin/env node
/**
 * Docmost Model Context Protocol (MCP) Bridge
 *
 * This script implements an MCP server that bridges Cursor with the Docmost API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import { resources } from "./resources.js";
import { makeRequest } from "./api.js";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

// Create a log file in the workspace root
const logFile = resolve(process.cwd(), "mcp-bridge.log");
function logToFile(message: string) {
  try {
    // Ensure the directory exists
    const logDir = dirname(logFile);
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
    writeFileSync(logFile, `${new Date().toISOString()} - ${message}\n`, {
      flag: "a",
    });
  } catch (error) {
    console.error("Failed to write to log file:", error);
  }
}

// Debug mode
const DEBUG = process.env.MCP_DEBUG === "true";

// Initialize MCP server
const server = new McpServer({
  name: "docmost",
  version: "1.0.0",
});

// Configure server with environment variables
// TODO: ARCHITECTURAL ISSUE - This approach of hardcoding user/workspace IDs
// in environment variables is fundamentally flawed for a multi-user system.
// The API key should be the sole authentication mechanism, and the server
// should derive user/workspace context from the API key itself.
// 
// Proper architecture would be:
// 1. Client provides only API key
// 2. Server validates API key and retrieves associated user/workspace
// 3. All operations use the context from the validated API key
//
// Current (flawed) configuration:
const config = {
  serverUrl: process.env.MCP_SERVER_URL || "http://localhost:3000",
  apiKey: process.env.MCP_API_KEY,
  userId: process.env.MCP_USER_ID, // Should be derived from API key!
  workspaceId: process.env.MCP_WORKSPACE_ID, // Should be derived from API key!
  userEmail: process.env.MCP_USER_EMAIL, // Should be derived from API key!
};

logToFile(`Starting MCP Bridge with configuration:
  MCP_SERVER_URL: ${config.serverUrl}
  MCP_API_KEY: ${config.apiKey ? "***" : "not set"}
  MCP_USER_ID: ${config.userId || "not set"}
  MCP_WORKSPACE_ID: ${config.workspaceId || "not set"}
  MCP_USER_EMAIL: ${config.userEmail || "not set"}
`);

// Helper function to convert JSON Schema to Zod schema
function jsonSchemaToZod(schema: any): z.ZodRawShape {
  if (!schema.type || schema.type !== "object") {
    return {};
  }

  const shape: z.ZodRawShape = {};
  for (const [key, value] of Object.entries(schema.properties || {})) {
    const prop = value as any;
    switch (prop.type) {
      case "string":
        shape[key] = z.string();
        break;
      case "number":
      case "integer":
        shape[key] = z.number();
        break;
      case "boolean":
        shape[key] = z.boolean();
        break;
      case "object":
        shape[key] = z.object(jsonSchemaToZod(prop));
        break;
      case "array":
        shape[key] = z.array(
          prop.items ? z.object(jsonSchemaToZod(prop.items)) : z.any()
        );
        break;
      default:
        shape[key] = z.any();
    }
    if (!schema.required?.includes(key)) {
      shape[key] = shape[key].optional();
    }
  }
  return shape;
}

async function main() {
  try {
    logToFile("=== Docmost MCP Bridge Starting ===");

    // Register tools from resources
    for (const resource of Object.values(resources)) {
      logToFile(`Registering resource: ${resource.name}`);

      // Register operations for this resource
      for (const [opName, operation] of Object.entries(resource.operations)) {
        const toolName = `${resource.name}_${opName}`;
        logToFile(`Registering tool: ${toolName}`);

        // Extract schema from the makeRequest call in the handler
        const methodName = `${resource.name}.${opName}`;
        logToFile(`Method name: ${methodName}`);

        // Determine the appropriate schema based on the operation
        let zodSchema: any = {};

        // Handle special cases for different operations
        if (resource.name === "space") {
          if (opName === "list") {
            zodSchema = {
              workspaceId: z.string(),
              page: z.number().optional(),
              limit: z.number().optional(),
              name: z.string().optional(), // Special case for space.list
            };
          } else if (opName === "create") {
            zodSchema = {
              name: z.string(),
              description: z.string().optional(),
              slug: z.string().optional(),
              workspaceId: z.string(),
            };
          } else if (opName === "update") {
            zodSchema = {
              spaceId: z.string(),
              workspaceId: z.string(),
              name: z.string().optional(),
              description: z.string().optional(),
              slug: z.string().optional(),
            };
          } else if (opName === "delete") {
            zodSchema = {
              spaceId: z.string(),
              workspaceId: z.string(),
            };
          }
        } else if (resource.name === "page") {
          if (opName === "list") {
            zodSchema = {
              spaceId: z.string(),
              workspaceId: z.string(),
              page: z.number().optional(),
              limit: z.number().optional(),
            };
          } else if (opName === "create") {
            zodSchema = {
              title: z.string(),
              content: z.object({
                type: z.string(),
                content: z.array(z.any()),
              }),
              spaceId: z.string(),
              workspaceId: z.string(),
              parentId: z.string().optional(),
            };
          } else if (opName === "update") {
            zodSchema = {
              pageId: z.string(),
              workspaceId: z.string(),
              title: z.string().optional(),
              content: z
                .object({
                  type: z.string(),
                  content: z.array(z.any()),
                })
                .optional(),
              parentId: z.string().optional(),
            };
          } else if (opName === "delete") {
            zodSchema = {
              pageId: z.string(),
              workspaceId: z.string(),
            };
          } else if (opName === "move") {
            zodSchema = {
              pageId: z.string(),
              workspaceId: z.string(),
              parentId: z.union([z.string(), z.null()]).optional(),
              spaceId: z.string().optional(),
            };
          }
        } else if (resource.name === "user") {
          if (opName === "list") {
            zodSchema = {
              workspaceId: z.string(),
              page: z.number().optional(),
              limit: z.number().optional(),
              query: z.string().optional(),
            };
          } else if (opName === "get") {
            zodSchema = {
              userId: z.string(),
              workspaceId: z.string(),
            };
          } else if (opName === "update") {
            zodSchema = {
              userId: z.string(),
              workspaceId: z.string(),
              name: z.string().optional(),
              role: z.string().optional(),
              avatarUrl: z.string().optional(),
            };
          }
        } else if (resource.name === "comment") {
          if (opName === "create") {
            zodSchema = {
              text: z.string().describe("Text content of the comment"),
              pageId: z
                .string()
                .describe("ID of the page this comment belongs to"),
              workspaceId: z.string().describe("ID of the workspace"),
              parentCommentId: z
                .string()
                .optional()
                .describe("ID of the parent comment, if replying to a comment"),
            };
          } else if (opName === "get") {
            zodSchema = {
              commentId: z.string(),
              workspaceId: z.string(),
            };
          } else if (opName === "list") {
            zodSchema = {
              pageId: z.string(),
              workspaceId: z.string(),
              page: z.number().optional(),
              limit: z.number().optional(),
            };
          } else if (opName === "update") {
            zodSchema = {
              commentId: z.string(),
              workspaceId: z.string(),
              content: z.object({
                text: z.string(),
              }),
            };
          } else if (opName === "delete") {
            zodSchema = {
              commentId: z.string(),
              workspaceId: z.string(),
            };
          }
        } else if (resource.name === "workspace") {
          if (opName === "create") {
            zodSchema = {
              name: z.string(),
              slug: z.string().optional(),
              logo: z.string().optional(),
            };
          } else if (opName === "get") {
            zodSchema = {
              workspaceId: z.string(),
            };
          } else if (opName === "list") {
            zodSchema = {
              page: z.number().optional(),
              limit: z.number().optional(),
            };
          } else if (opName === "update") {
            zodSchema = {
              workspaceId: z.string(),
              name: z.string().optional(),
              slug: z.string().optional(),
              logo: z.string().optional(),
            };
          } else if (opName === "delete") {
            zodSchema = {
              workspaceId: z.string(),
            };
          } else if (opName === "addMember") {
            zodSchema = {
              workspaceId: z.string(),
              email: z.string(),
              role: z.string().optional(),
            };
          } else if (opName === "removeMember") {
            zodSchema = {
              workspaceId: z.string(),
              userId: z.string(),
            };
          }
        } else if (resource.name === "group") {
          if (opName === "create") {
            zodSchema = {
              name: z.string(),
              description: z.string().optional(),
              workspaceId: z.string(),
            };
          } else if (opName === "get") {
            zodSchema = {
              groupId: z.string(),
              workspaceId: z.string(),
            };
          } else if (opName === "list") {
            zodSchema = {
              workspaceId: z.string(),
              page: z.number().optional(),
              limit: z.number().optional(),
              query: z.string().optional(),
            };
          } else if (opName === "update") {
            zodSchema = {
              groupId: z.string(),
              workspaceId: z.string(),
              name: z.string().optional(),
              description: z.string().optional(),
            };
          } else if (opName === "delete") {
            zodSchema = {
              groupId: z.string(),
              workspaceId: z.string(),
            };
          } else if (opName === "addMember" || opName === "removeMember") {
            zodSchema = {
              groupId: z.string(),
              userId: z.string(),
              workspaceId: z.string(),
            };
          }
        } else if (resource.name === "attachment") {
          if (opName === "upload") {
            zodSchema = {
              fileName: z.string(),
              mimeType: z.string(),
              size: z.number(),
              pageId: z.string(),
              workspaceId: z.string(),
              fileContent: z.string(),
            };
          } else if (
            opName === "get" ||
            opName === "download" ||
            opName === "delete"
          ) {
            zodSchema = {
              attachmentId: z.string(),
              workspaceId: z.string(),
            };
          } else if (opName === "list") {
            zodSchema = {
              pageId: z.string(),
              workspaceId: z.string(),
              page: z.number().optional(),
              limit: z.number().optional(),
            };
          }
        } else if (resource.name === "ui") {
          if (opName === "navigate") {
            zodSchema = {
              destination: z.enum(["space", "page", "home", "dashboard"]),
              spaceId: z.string().optional(),
              spaceSlug: z.string().optional(),
              pageId: z.string().optional(),
              pageSlug: z.string().optional(),
              workspaceId: z.string(),
            };
          }
        }

        // Register the tool with MCP
        server.tool(
          toolName,
          operation.description,
          zodSchema,
          async (params: Record<string, any>) => {
            logToFile(
              `Handling ${toolName} with params: ${JSON.stringify(params)}`
            );

            // Remove any invalid parameters like random_string
            if (params.random_string) {
              const { random_string, ...validParams } = params;
              params = validParams;
              logToFile(`Removed random_string parameter from ${toolName}`);
            }

            try {
              // Special handling for page.move operation with null parentId
              if (
                resource.name === "page" &&
                opName === "move" &&
                params.parentId === null
              ) {
                logToFile(`Handling null parentId in page.move operation`);

                // Some APIs might expect null, others might expect the field to be omitted
                // Try both approaches with a slight preference for explicit null
                const result = await makeRequest(
                  `${resource.name}.${opName}`,
                  params
                );

                logToFile(`Tool ${toolName} completed successfully`);

                // Format the response according to MCP protocol expectations
                return {
                  content: [
                    {
                      type: "text" as const,
                      text: JSON.stringify(result, null, 2),
                    },
                  ],
                };
              }

              // Special handling for page.move operation to map spaceId to targetSpaceId
              if (
                resource.name === "page" &&
                opName === "move" &&
                params.spaceId
              ) {
                logToFile(
                  `Mapping spaceId to targetSpaceId in page.move operation`
                );
                const { spaceId, ...restParams } = params;
                params = { ...restParams, targetSpaceId: spaceId };
              }

              // Remove name parameter for space.list if it's present but not used
              if (
                resource.name === "space" &&
                opName === "list" &&
                params.name
              ) {
                const { name, ...restParams } = params;
                params = restParams;
              }

              // Special handling for group.addMember to transform userId into userIds array
              if (
                resource.name === "group" &&
                opName === "addMember" &&
                params.userId
              ) {
                logToFile(`Adding userIds array to group.addMember operation`);
                // Keep userId and also add userIds array
                params = { ...params, userIds: [params.userId] };
              }

              // Special handling for attachment.upload
              if (resource.name === "attachment" && opName === "upload") {
                logToFile(`Handling attachment.upload operation`);
                const result = await makeRequest("attachment.upload", params);
                logToFile(`Tool ${toolName} completed successfully`);
                return {
                  content: [
                    {
                      type: "text" as const,
                      text: JSON.stringify(result, null, 2),
                    },
                  ],
                };
              }

              // Special handling for comment content format
              if (
                resource.name === "comment" &&
                opName === "create" &&
                params.text
              ) {
                logToFile(`Creating comment with text: ${params.text}`);
                // Create content object from text parameter
                params.content = { text: params.text };
                delete params.text;
                logToFile(
                  `Converted text to content object: ${JSON.stringify(params.content)}`
                );

                // Handle parentId parameter if it exists, renaming to parentCommentId
                if (params.parentId) {
                  params.parentCommentId = params.parentId;
                  delete params.parentId;
                  logToFile(
                    `Renamed parentId to parentCommentId: ${params.parentCommentId}`
                  );
                }
              } else if (
                resource.name === "comment" &&
                opName === "update" &&
                params.content
              ) {
                logToFile(`Normalizing comment content format for update`);
                logToFile(`Comment content type: ${typeof params.content}`);
                logToFile(
                  `Comment content value: ${JSON.stringify(params.content)}`
                );

                // If content is a string, convert it to { text: content }
                if (typeof params.content === "string") {
                  params.content = { text: params.content };
                  logToFile(
                    `Converted comment content string to object format`
                  );
                }
                // If content is already a JSON string, parse it
                else if (
                  typeof params.content === "string" &&
                  params.content.startsWith("{") &&
                  params.content.endsWith("}")
                ) {
                  try {
                    params.content = JSON.parse(params.content);
                    logToFile(`Parsed JSON string comment content to object`);
                  } catch (error) {
                    logToFile(`Failed to parse JSON comment content: ${error}`);
                  }
                }

                // Ensure the content is in the right format
                logToFile(
                  `Final comment content format: ${JSON.stringify(params.content)}`
                );
              }

              const result = await makeRequest(
                `${resource.name}.${opName}`,
                params
              );
              logToFile(`Tool ${toolName} completed successfully`);

              // Format the response according to MCP protocol expectations
              return {
                content: [
                  {
                    type: "text" as const,
                    text: JSON.stringify(result, null, 2),
                  },
                ],
              };
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              logToFile(`Error in ${toolName}: ${errorMessage}`);

              // Format error response in the expected format
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Error: ${errorMessage}`,
                  },
                ],
                isError: true,
              };
            }
          }
        );
      }
    }

    // Connect to MCP
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logToFile("MCP Bridge running successfully");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logToFile(`Fatal error: ${errorMessage}`);
    console.error(`Fatal error: ${errorMessage}`);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
