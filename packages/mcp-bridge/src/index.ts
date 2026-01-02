#!/usr/bin/env node
/**
 * Raven Docs Model Context Protocol (MCP) Bridge - Refactored Version
 *
 * This script implements an MCP server that bridges Cursor with the Raven Docs API.
 * 
 * REFACTORED: Removed hardcoded user/workspace IDs. The API key now provides
 * all necessary authentication context server-side.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resources } from "./resources.js";
import { makeRequest } from "./api.js";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

// Create a log file in the workspace root
const logFile = resolve(process.cwd(), "mcp-bridge.log");
function logToFile(message: string) {
  try {
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
  name: "raven-docs",
  version: "1.0.0",
});

// Configure server with environment variables
// REFACTORED: Only need server URL and API key
const config = {
  serverUrl: process.env.MCP_SERVER_URL || "http://localhost:3000",
  apiKey: process.env.MCP_API_KEY,
};

logToFile(`Starting MCP Bridge (Refactored) with configuration:
  MCP_SERVER_URL: ${config.serverUrl}
  MCP_API_KEY: ${config.apiKey ? "***" : "not set"}
`);

async function main() {
  try {
    logToFile("=== Raven Docs MCP Bridge Starting (Refactored) ===");

    // Register tools from resources
    for (const resource of Object.values(resources)) {
      logToFile(`Registering resource: ${resource.name}`);

      // Register operations for this resource
      for (const [opName, operation] of Object.entries(resource.operations)) {
        const toolName = `${resource.name}_${opName}`;
        logToFile(`Registering tool: ${toolName}`);

        // Create schemas WITHOUT workspaceId requirements
        let zodSchema: any = {};

        // Define schemas for each resource/operation
        if (resource.name === "space") {
          if (opName === "list") {
            zodSchema = {
              page: z.number().optional(),
              limit: z.number().optional(),
              name: z.string().optional(),
            };
          } else if (opName === "create") {
            zodSchema = {
              name: z.string(),
              description: z.string().optional(),
              slug: z.string().optional(),
            };
          } else if (opName === "update") {
            zodSchema = {
              spaceId: z.string(),
              name: z.string().optional(),
              description: z.string().optional(),
              slug: z.string().optional(),
            };
          } else if (opName === "delete") {
            zodSchema = {
              spaceId: z.string(),
            };
          }
        } else if (resource.name === "page") {
          if (opName === "list") {
            zodSchema = {
              spaceId: z.string(),
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
              parentId: z.string().optional(),
            };
          } else if (opName === "update") {
            zodSchema = {
              pageId: z.string(),
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
            };
          } else if (opName === "move") {
            zodSchema = {
              pageId: z.string(),
              parentId: z.union([z.string(), z.null()]).optional(),
              spaceId: z.string().optional(),
            };
          }
        } else if (resource.name === "user") {
          if (opName === "list") {
            zodSchema = {
              page: z.number().optional(),
              limit: z.number().optional(),
              query: z.string().optional(),
            };
          } else if (opName === "get") {
            zodSchema = {
              userId: z.string(),
            };
          } else if (opName === "update") {
            zodSchema = {
              userId: z.string(),
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
              parentCommentId: z
                .string()
                .optional()
                .describe("ID of the parent comment, if replying to a comment"),
            };
          } else if (opName === "get") {
            zodSchema = {
              commentId: z.string(),
            };
          } else if (opName === "list") {
            zodSchema = {
              pageId: z.string(),
              page: z.number().optional(),
              limit: z.number().optional(),
            };
          } else if (opName === "update") {
            zodSchema = {
              commentId: z.string(),
              content: z.object({
                text: z.string(),
              }),
            };
          } else if (opName === "delete") {
            zodSchema = {
              commentId: z.string(),
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
              workspaceId: z.string().optional().describe("Optional workspace ID. If not provided, returns current workspace from API key context."),
            };
          } else if (opName === "list") {
            zodSchema = {
              page: z.number().optional(),
              limit: z.number().optional(),
            };
          } else if (opName === "update") {
            zodSchema = {
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
              email: z.string(),
              role: z.string().optional(),
            };
          } else if (opName === "removeMember") {
            zodSchema = {
              userId: z.string(),
            };
          }
        } else if (resource.name === "group") {
          if (opName === "create") {
            zodSchema = {
              name: z.string(),
              description: z.string().optional(),
            };
          } else if (opName === "get") {
            zodSchema = {
              groupId: z.string(),
            };
          } else if (opName === "list") {
            zodSchema = {
              page: z.number().optional(),
              limit: z.number().optional(),
              query: z.string().optional(),
            };
          } else if (opName === "update") {
            zodSchema = {
              groupId: z.string(),
              name: z.string().optional(),
              description: z.string().optional(),
            };
          } else if (opName === "delete") {
            zodSchema = {
              groupId: z.string(),
            };
          } else if (opName === "addMember" || opName === "removeMember") {
            zodSchema = {
              groupId: z.string(),
              userId: z.string(),
            };
          }
        } else if (resource.name === "attachment") {
          if (opName === "upload") {
            zodSchema = {
              fileName: z.string(),
              mimeType: z.string(),
              size: z.number(),
              pageId: z.string(),
              fileContent: z.string(),
            };
          } else if (
            opName === "get" ||
            opName === "download" ||
            opName === "delete"
          ) {
            zodSchema = {
              attachmentId: z.string(),
            };
          } else if (opName === "list") {
            zodSchema = {
              pageId: z.string(),
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

            try {
              // Special handling for specific operations
              if (
                resource.name === "page" &&
                opName === "move" &&
                params.parentId === null
              ) {
                logToFile(`Handling null parentId in page.move operation`);
              }

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

              if (
                resource.name === "group" &&
                opName === "addMember" &&
                params.userId
              ) {
                logToFile(`Adding userIds array to group.addMember operation`);
                params = { ...params, userIds: [params.userId] };
              }

              if (
                resource.name === "comment" &&
                opName === "create" &&
                params.text
              ) {
                logToFile(`Creating comment with text: ${params.text}`);
                params.content = { text: params.text };
                delete params.text;
                
                if (params.parentId) {
                  params.parentCommentId = params.parentId;
                  delete params.parentId;
                }
              } else if (
                resource.name === "comment" &&
                opName === "update" &&
                params.content
              ) {
                if (typeof params.content === "string") {
                  params.content = { text: params.content };
                }
              }

              const result = await makeRequest(
                `${resource.name}.${opName}`,
                params
              );
              
              logToFile(`Tool ${toolName} completed successfully`);

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
    logToFile("MCP Bridge (Refactored) running successfully");
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