import { z } from "zod";
import { api } from "./api.js";
import axios from "axios";

// Define common schemas
const contentSchema = z
  .object({
    type: z.string(),
    content: z.array(z.any()),
  })
  .describe("Content in Raven Docs format");

// Helper function to make API requests with type validation
async function makeRequest<T extends z.ZodSchema>(
  method: string,
  schema: T,
  data?: z.infer<T>,
  httpMethod: string = "POST"
) {
  console.error(`[DEBUG] Making ${httpMethod} request with method ${method}`);
  console.error(`[DEBUG] Data: ${JSON.stringify(data, null, 2)}`);
  console.error(
    `[DEBUG] Headers: ${JSON.stringify(api.defaults.headers, null, 2)}`
  );

  try {
    // Validate data against schema if provided
    if (schema && data) {
      try {
        schema.parse(data);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.error("[DEBUG] Validation Error:", validationError.errors);
          throw new Error(`Validation failed: ${validationError.message}`);
        }
        throw validationError;
      }
    }

    // Format as JSON-RPC 2.0 request
    const jsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params: data,
      id: Date.now(),
    };

    console.error(
      `[DEBUG] JSON-RPC Request: ${JSON.stringify(jsonRpcRequest, null, 2)}`
    );

    const response = await api({
      method: "POST", // Always POST for JSON-RPC
      url: "/api/mcp",
      data: jsonRpcRequest,
    });

    // Handle JSON-RPC error responses
    if (response.data.error) {
      console.error("[DEBUG] JSON-RPC Error:", response.data.error);
      const errorMessage = response.data.error.message || "Unknown error";
      const errorCode = response.data.error.code;
      const errorData = response.data.error.data;

      throw new Error(
        `JSON-RPC error ${errorCode}: ${errorMessage}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ""
        }`
      );
    }

    console.error(
      `[DEBUG] Response: ${JSON.stringify(response.data, null, 2)}`
    );

    // If result is null or undefined, return a success message
    if (response.data.result === null || response.data.result === undefined) {
      return {
        success: true,
        message: `Operation ${method} completed successfully`,
      };
    }

    return response.data.result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[DEBUG] Validation Error:", error.errors);
      throw new Error(`Validation failed: ${error.message}`);
    }
    if (axios.isAxiosError(error)) {
      console.error("[DEBUG] API Error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });
      throw new Error(
        `API request failed: ${error.response?.data?.message || error.message}`
      );
    }
    // Re-throw any other errors
    throw error;
  }
}

// Space resource schemas
const createSpaceSchema = z.object({
  name: z.string().describe("Name of the space"),
  description: z.string().optional().describe("Description of the space"),
  slug: z.string().optional().describe("URL-friendly slug for the space"),
  workspaceId: z.string().describe("ID of the workspace this space belongs to"),
});

const updateSpaceSchema = z.object({
  spaceId: z.string().describe("ID of the space to update"),
  workspaceId: z.string().describe("ID of the workspace this space belongs to"),
  name: z.string().optional().describe("New name for the space"),
  description: z.string().optional().describe("Description of the space"),
  slug: z.string().optional().describe("URL-friendly slug for the space"),
});

// Space resource
const spaceResource = {
  name: "space",
  description: "Manage spaces in Raven Docs",
  schema: createSpaceSchema,
  operations: {
    create: {
      description: "Create a new space",
      handler: async (params: z.infer<typeof createSpaceSchema>) => {
        return makeRequest("space.create", createSpaceSchema, params);
      },
    },
    list: {
      description: "List all spaces",
      handler: async (params?: {
        workspaceId: string;
        page?: number;
        limit?: number;
      }) => {
        return makeRequest(
          "space.list",
          z.object({
            workspaceId: z.string().describe("ID of the workspace"),
            page: z
              .number()
              .int()
              .optional()
              .describe("Page number for pagination"),
            limit: z
              .number()
              .int()
              .optional()
              .describe("Number of items per page"),
          }),
          params
        );
      },
    },
    update: {
      description: "Update a space",
      handler: async (params: z.infer<typeof updateSpaceSchema>) => {
        return makeRequest("space.update", updateSpaceSchema, params);
      },
    },
    delete: {
      description: "Delete a space",
      handler: async (params: { spaceId: string; workspaceId: string }) => {
        return makeRequest(
          "space.delete",
          z.object({
            spaceId: z.string().describe("ID of the space to delete"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
  },
};

// Page resource schemas
const createPageSchema = z.object({
  title: z.string().describe("Title of the page"),
  content: contentSchema,
  spaceId: z.string().describe("ID of the space this page belongs to"),
  workspaceId: z.string().describe("ID of the workspace this page belongs to"),
  parentId: z.string().optional().describe("ID of the parent page, if any"),
});

const updatePageSchema = z.object({
  pageId: z.string().describe("ID of the page to update"),
  workspaceId: z.string().describe("ID of the workspace this page belongs to"),
  title: z.string().optional().describe("New title for the page"),
  content: contentSchema.optional().describe("New content for the page"),
  parentId: z.string().optional().describe("ID of the parent page"),
});

const movePageSchema = z.object({
  pageId: z.string().describe("ID of the page to move"),
  workspaceId: z.string().describe("ID of the workspace this page belongs to"),
  parentId: z
    .union([z.string(), z.null()])
    .optional()
    .describe("ID of the new parent page"),
  spaceId: z
    .string()
    .optional()
    .describe("ID of the new space (mapped to targetSpaceId in the API)"),
});

// Page resource
const pageResource = {
  name: "page",
  description: "Manage pages in Raven Docs",
  schema: createPageSchema,
  operations: {
    create: {
      description: "Create a new page",
      handler: async (params: z.infer<typeof createPageSchema>) => {
        return makeRequest("page.create", createPageSchema, params);
      },
    },
    list: {
      description: "List pages in a space",
      handler: async (params: { spaceId: string; workspaceId: string }) => {
        return makeRequest(
          "page.list",
          z.object({
            spaceId: z.string().describe("ID of the space"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
    update: {
      description: "Update a page",
      handler: async (params: z.infer<typeof updatePageSchema>) => {
        return makeRequest("page.update", updatePageSchema, params);
      },
    },
    delete: {
      description: "Delete a page",
      handler: async (params: { pageId: string; workspaceId: string }) => {
        return makeRequest(
          "page.delete",
          z.object({
            pageId: z.string().describe("ID of the page to delete"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
    move: {
      description: "Move a page to a different parent or space",
      handler: async (params: z.infer<typeof movePageSchema>) => {
        return makeRequest("page.move", movePageSchema, params);
      },
    },
  },
};

// User resource schemas
const createUserSchema = z.object({
  name: z.string().describe("Name of the user"),
  email: z.string().describe("Email of the user"),
  password: z.string().describe("Password for the user"),
  role: z.string().optional().describe("Role of the user in the workspace"),
  workspaceId: z.string().describe("ID of the workspace this user belongs to"),
});

const updateUserSchema = z.object({
  userId: z.string().describe("ID of the user to update"),
  workspaceId: z.string().describe("ID of the workspace this user belongs to"),
  name: z.string().optional().describe("New name for the user"),
  role: z.string().optional().describe("New role for the user"),
  avatarUrl: z.string().optional().describe("New avatar URL for the user"),
});

// User resource
const userResource = {
  name: "user",
  description: "Manage users in Raven Docs",
  operations: {
    list: {
      description: "List users in a workspace",
      handler: async (params: {
        workspaceId: string;
        page?: number;
        limit?: number;
        query?: string;
      }) => {
        return makeRequest(
          "user.list",
          z.object({
            workspaceId: z.string().describe("ID of the workspace"),
            page: z.number().optional().describe("Page number for pagination"),
            limit: z.number().optional().describe("Number of items per page"),
            query: z.string().optional().describe("Search query string"),
          }),
          params
        );
      },
    },
    get: {
      description: "Get a user's details",
      handler: async (params: { userId: string; workspaceId: string }) => {
        return makeRequest(
          "user.get",
          z.object({
            userId: z.string().describe("ID of the user to get"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
    update: {
      description: "Update a user",
      handler: async (params: z.infer<typeof updateUserSchema>) => {
        return makeRequest("user.update", updateUserSchema, params);
      },
    },
  },
};

// Comment resource schemas
const createCommentSchema = z.object({
  content: z
    .union([
      z
        .string()
        .describe("Content of the comment as text (will be converted to JSON)"),
      z
        .object({
          text: z.string().describe("Text content of the comment"),
        })
        .describe("Content of the comment as JSON object"),
    ])
    .describe("Content of the comment"),
  pageId: z.string().describe("ID of the page this comment belongs to"),
  workspaceId: z.string().describe("ID of the workspace"),
  parentCommentId: z
    .string()
    .optional()
    .describe("ID of the parent comment, if replying to a comment"),
});

const updateCommentSchema = z.object({
  commentId: z.string().describe("ID of the comment to update"),
  workspaceId: z.string().describe("ID of the workspace"),
  content: z
    .object({
      text: z.string().describe("Text content of the comment"),
    })
    .describe("New content for the comment"),
});

// Comment resource
const commentResource = {
  name: "comment",
  description: "Manage comments in Raven Docs",
  operations: {
    create: {
      description: "Create a new comment",
      handler: async (params: z.infer<typeof createCommentSchema>) => {
        return makeRequest("comment.create", createCommentSchema, params);
      },
    },
    get: {
      description: "Get a comment's details",
      handler: async (params: { commentId: string; workspaceId: string }) => {
        return makeRequest(
          "comment.get",
          z.object({
            commentId: z.string().describe("ID of the comment to get"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
    list: {
      description: "List comments for a page",
      handler: async (params: {
        pageId: string;
        workspaceId: string;
        page?: number;
        limit?: number;
      }) => {
        return makeRequest(
          "comment.list",
          z.object({
            pageId: z.string().describe("ID of the page"),
            workspaceId: z.string().describe("ID of the workspace"),
            page: z.number().optional().describe("Page number for pagination"),
            limit: z.number().optional().describe("Number of items per page"),
          }),
          params
        );
      },
    },
    update: {
      description: "Update a comment",
      handler: async (params: z.infer<typeof updateCommentSchema>) => {
        return makeRequest("comment.update", updateCommentSchema, params);
      },
    },
    delete: {
      description: "Delete a comment",
      handler: async (params: { commentId: string; workspaceId: string }) => {
        return makeRequest(
          "comment.delete",
          z.object({
            commentId: z.string().describe("ID of the comment to delete"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
  },
};

// Workspace resource schemas
const createWorkspaceSchema = z.object({
  name: z.string().describe("Name of the workspace"),
  slug: z.string().optional().describe("URL-friendly slug for the workspace"),
  logo: z.string().optional().describe("Logo URL for the workspace"),
});

const updateWorkspaceSchema = z.object({
  workspaceId: z.string().describe("ID of the workspace to update"),
  name: z.string().optional().describe("New name for the workspace"),
  slug: z.string().optional().describe("New URL-friendly slug"),
  logo: z.string().optional().describe("New logo URL"),
});

// Workspace resource
const workspaceResource = {
  name: "workspace",
  description: "Manage workspaces in Raven Docs",
  operations: {
    create: {
      description: "Create a new workspace",
      handler: async (params: z.infer<typeof createWorkspaceSchema>) => {
        return makeRequest("workspace.create", createWorkspaceSchema, params);
      },
    },
    get: {
      description: "Get a workspace's details",
      handler: async (params: { workspaceId: string }) => {
        return makeRequest(
          "workspace.get",
          z.object({
            workspaceId: z.string().describe("ID of the workspace to get"),
          }),
          params
        );
      },
    },
    list: {
      description: "List workspaces",
      handler: async (params?: { page?: number; limit?: number }) => {
        return makeRequest(
          "workspace.list",
          z.object({
            page: z.number().optional().describe("Page number for pagination"),
            limit: z.number().optional().describe("Number of items per page"),
          }),
          params
        );
      },
    },
    update: {
      description: "Update a workspace",
      handler: async (params: z.infer<typeof updateWorkspaceSchema>) => {
        return makeRequest("workspace.update", updateWorkspaceSchema, params);
      },
    },
    delete: {
      description: "Delete a workspace",
      handler: async (params: { workspaceId: string }) => {
        return makeRequest(
          "workspace.delete",
          z.object({
            workspaceId: z.string().describe("ID of the workspace to delete"),
          }),
          params
        );
      },
    },
    addMember: {
      description: "Add a member to a workspace",
      handler: async (params: {
        workspaceId: string;
        email: string;
        role?: string;
      }) => {
        return makeRequest(
          "workspace.addMember",
          z.object({
            workspaceId: z.string().describe("ID of the workspace"),
            email: z.string().describe("Email of the user to add"),
            role: z.string().optional().describe("Role to assign to the user"),
          }),
          params
        );
      },
    },
    removeMember: {
      description: "Remove a member from a workspace",
      handler: async (params: { workspaceId: string; userId: string }) => {
        return makeRequest(
          "workspace.removeMember",
          z.object({
            workspaceId: z.string().describe("ID of the workspace"),
            userId: z.string().describe("ID of the user to remove"),
          }),
          params
        );
      },
    },
  },
};

// Group resource schemas
const createGroupSchema = z.object({
  name: z.string().describe("Name of the group"),
  description: z.string().optional().describe("Description of the group"),
  workspaceId: z.string().describe("ID of the workspace this group belongs to"),
});

const updateGroupSchema = z.object({
  groupId: z.string().describe("ID of the group to update"),
  workspaceId: z.string().describe("ID of the workspace this group belongs to"),
  name: z.string().optional().describe("New name for the group"),
  description: z.string().optional().describe("New description for the group"),
});

// Group resource
const groupResource = {
  name: "group",
  description: "Manage groups in Raven Docs",
  operations: {
    create: {
      description: "Create a new group",
      handler: async (params: z.infer<typeof createGroupSchema>) => {
        return makeRequest("group.create", createGroupSchema, params);
      },
    },
    get: {
      description: "Get a group's details",
      handler: async (params: { groupId: string; workspaceId: string }) => {
        return makeRequest(
          "group.get",
          z.object({
            groupId: z.string().describe("ID of the group to get"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
    list: {
      description: "List groups in a workspace",
      handler: async (params: {
        workspaceId: string;
        page?: number;
        limit?: number;
        query?: string;
      }) => {
        return makeRequest(
          "group.list",
          z.object({
            workspaceId: z.string().describe("ID of the workspace"),
            page: z.number().optional().describe("Page number for pagination"),
            limit: z.number().optional().describe("Number of items per page"),
            query: z
              .string()
              .optional()
              .describe("Search query for filtering groups"),
          }),
          params
        );
      },
    },
    update: {
      description: "Update a group",
      handler: async (params: z.infer<typeof updateGroupSchema>) => {
        return makeRequest("group.update", updateGroupSchema, params);
      },
    },
    delete: {
      description: "Delete a group",
      handler: async (params: { groupId: string; workspaceId: string }) => {
        return makeRequest(
          "group.delete",
          z.object({
            groupId: z.string().describe("ID of the group to delete"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
    addMember: {
      description: "Add a member to a group",
      handler: async (params: {
        groupId: string;
        userId: string;
        workspaceId: string;
      }) => {
        return makeRequest(
          "group.addMember",
          z.object({
            groupId: z.string().describe("ID of the group"),
            userId: z.string().describe("ID of the user to add"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
    removeMember: {
      description: "Remove a member from a group",
      handler: async (params: {
        groupId: string;
        userId: string;
        workspaceId: string;
      }) => {
        return makeRequest(
          "group.removeMember",
          z.object({
            groupId: z.string().describe("ID of the group"),
            userId: z.string().describe("ID of the user to remove"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
  },
};

// Attachment resource schemas
const uploadAttachmentSchema = z.object({
  fileName: z.string().describe("Name of the file"),
  mimeType: z.string().describe("MIME type of the file"),
  size: z.number().describe("Size of the file in bytes"),
  pageId: z.string().describe("ID of the page this attachment belongs to"),
  workspaceId: z.string().describe("ID of the workspace"),
  fileContent: z.string().describe("Base64-encoded content of the file"),
});

// Attachment resource
const attachmentResource = {
  name: "attachment",
  description: "Manage attachments in Raven Docs",
  operations: {
    upload: {
      description: "Upload a new attachment",
      handler: async (params: z.infer<typeof uploadAttachmentSchema>) => {
        return makeRequest("attachment.upload", uploadAttachmentSchema, params);
      },
    },
    get: {
      description: "Get attachment details",
      handler: async (params: {
        attachmentId: string;
        workspaceId: string;
      }) => {
        return makeRequest(
          "attachment.get",
          z.object({
            attachmentId: z.string().describe("ID of the attachment to get"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
    list: {
      description: "List attachments for a page",
      handler: async (params: {
        pageId: string;
        workspaceId: string;
        page?: number;
        limit?: number;
      }) => {
        return makeRequest(
          "attachment.list",
          z.object({
            pageId: z.string().describe("ID of the page"),
            workspaceId: z.string().describe("ID of the workspace"),
            page: z.number().optional().describe("Page number for pagination"),
            limit: z.number().optional().describe("Number of items per page"),
          }),
          params
        );
      },
    },
    download: {
      description: "Download an attachment",
      handler: async (params: {
        attachmentId: string;
        workspaceId: string;
      }) => {
        return makeRequest(
          "attachment.download",
          z.object({
            attachmentId: z
              .string()
              .describe("ID of the attachment to download"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
    delete: {
      description: "Delete an attachment",
      handler: async (params: {
        attachmentId: string;
        workspaceId: string;
      }) => {
        return makeRequest(
          "attachment.delete",
          z.object({
            attachmentId: z.string().describe("ID of the attachment to delete"),
            workspaceId: z.string().describe("ID of the workspace"),
          }),
          params
        );
      },
    },
  },
};

// UI resource schema
const navigateUISchema = z.object({
  destination: z
    .enum(["space", "page", "home", "dashboard"])
    .describe("The UI destination to navigate to"),
  spaceId: z.string().optional().describe("ID of the space to navigate to"),
  spaceSlug: z.string().optional().describe("Slug of the space to navigate to"),
  pageId: z.string().optional().describe("ID of the page to navigate to"),
  pageSlug: z.string().optional().describe("Slug of the page to navigate to"),
  workspaceId: z.string().describe("ID of the workspace"),
});

// UI resource
const uiResource = {
  name: "ui",
  description: "Control the Raven Docs UI",
  operations: {
    navigate: {
      description: "Navigate to a specific destination in the UI",
      handler: async (params: z.infer<typeof navigateUISchema>) => {
        return makeRequest("ui.navigate", navigateUISchema, params);
      },
    },
  },
};

// Export all resources
export const resources = [
  spaceResource,
  pageResource,
  userResource,
  commentResource,
  workspaceResource,
  groupResource,
  attachmentResource,
  uiResource,
];
