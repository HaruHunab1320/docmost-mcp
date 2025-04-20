import { useAtom } from "jotai";
import { mcpSocketAtom } from "../atoms/mcp-socket-atom";
import { useEffect, useRef } from "react";
import {
  MCPEvent,
  MCPEventType,
  MCPResourceType,
} from "../types/mcp-event.types";
import { useQueryClient } from "@tanstack/react-query";
import { treeDataAtom } from "@/features/page/tree/atoms/tree-data-atom";

/**
 * A hook that listens for MCP events and updates the application state accordingly
 */
export const useMCPEvents = () => {
  const [socket] = useAtom(mcpSocketAtom);
  const [treeData, setTreeData] = useAtom(treeDataAtom);
  const queryClient = useQueryClient();
  const eventHandlerRegistered = useRef(false);

  useEffect(() => {
    if (!socket) {
      console.log(
        "%c[MCP-EVENTS] Socket not available, cannot listen for events",
        "background: #F44336; color: white; padding: 3px; border-radius: 3px;"
      );
      return;
    }

    // Avoid double registration
    if (eventHandlerRegistered.current) {
      console.log(
        "%c[MCP-EVENTS] Event handlers already registered, skipping",
        "background: #FF9800; color: white; padding: 3px; border-radius: 3px;"
      );
      return;
    }

    console.log(
      "%c[MCP-EVENTS] Setting up event listeners",
      "background: #2196F3; color: white; padding: 3px; border-radius: 3px;"
    );

    // Define the event handler
    const handleMCPEvent = (event: MCPEvent) => {
      console.log(
        `%c[MCP-EVENT RECEIVED] ${event.type}.${event.resource} %cID: ${event.resourceId}`,
        "background: #4CAF50; color: white; padding: 3px; border-radius: 3px;",
        "color: #2196F3; font-weight: bold;"
      );
      console.log("Event details:", event);

      // Handle different resource types
      switch (event.resource) {
        case MCPResourceType.PAGE:
          console.log(
            `%c[MCP-EVENT] Processing PAGE event`,
            "color: #FF9800; font-weight: bold;"
          );
          handlePageEvent(event);
          break;
        case MCPResourceType.SPACE:
          console.log(
            `%c[MCP-EVENT] Processing SPACE event`,
            "color: #FF9800; font-weight: bold;"
          );
          handleSpaceEvent(event);
          break;
        case MCPResourceType.COMMENT:
          console.log(
            `%c[MCP-EVENT] Processing COMMENT event`,
            "color: #FF9800; font-weight: bold;"
          );
          handleCommentEvent(event);
          break;
        case MCPResourceType.ATTACHMENT:
          console.log(
            `%c[MCP-EVENT] Processing ATTACHMENT event`,
            "color: #FF9800; font-weight: bold;"
          );
          handleAttachmentEvent(event);
          break;
        case MCPResourceType.GROUP:
          console.log(
            `%c[MCP-EVENT] Processing GROUP event`,
            "color: #FF9800; font-weight: bold;"
          );
          handleGroupEvent(event);
          break;
        case MCPResourceType.USER:
          console.log(
            `%c[MCP-EVENT] Processing USER event`,
            "color: #FF9800; font-weight: bold;"
          );
          handleUserEvent(event);
          break;
        case MCPResourceType.WORKSPACE:
          console.log(
            `%c[MCP-EVENT] Processing WORKSPACE event`,
            "color: #FF9800; font-weight: bold;"
          );
          handleWorkspaceEvent(event);
          break;
        default:
          console.warn(
            `%c[MCP-EVENT] Unknown resource type: ${event.resource}`,
            "color: #F44336; font-weight: bold;"
          );
      }
    };

    // IMPORTANT: Make sure event listeners are not duplicated
    socket.off("mcp:event");

    // Register the event handler
    socket.on("mcp:event", handleMCPEvent);
    eventHandlerRegistered.current = true;

    console.log(
      "%c[MCP-EVENTS] Event listener registered successfully",
      "background: #4CAF50; color: white; padding: 3px; border-radius: 3px;"
    );

    // Cleanup function to remove event listener when component unmounts
    return () => {
      console.log(
        "%c[MCP-EVENTS] Removing event listeners",
        "background: #607D8B; color: white; padding: 3px; border-radius: 3px;"
      );
      socket.off("mcp:event", handleMCPEvent);
      eventHandlerRegistered.current = false;
    };
  }, [socket, queryClient]);

  // Function to handle page events
  const handlePageEvent = (event: MCPEvent) => {
    console.log(
      `%c[MCP-HANDLER] Handling PAGE event ${event.type}`,
      "background: #4CAF50; color: white; padding: 3px; border-radius: 3px;"
    );

    // Always refetch pages data immediately
    console.log(
      `%c[MCP-HANDLER] 🔄 IMMEDIATELY refetching pages list`,
      "background: #FF9800; color: white; padding: 3px; border-radius: 3px;"
    );

    // Force refetch pages data with highest priority
    queryClient.refetchQueries({
      queryKey: ["pages"],
      type: "all",
      exact: false,
    });

    if (event.resourceId) {
      // Handle specific page
      console.log(
        `%c[MCP-HANDLER] 🔄 IMMEDIATELY refetching page ${event.resourceId}`,
        "background: #FF9800; color: white; padding: 3px; border-radius: 3px;"
      );

      // Force refetch the specific page with highest priority
      queryClient.refetchQueries({
        queryKey: ["page", event.resourceId],
      });

      // Also refetch the content
      queryClient.refetchQueries({
        queryKey: ["pageContent", event.resourceId],
      });
    }

    // If this is a page in a space, also handle space's pages
    if (event.spaceId) {
      console.log(
        `%c[MCP-HANDLER] 🔄 IMMEDIATELY refetching pages for space ${event.spaceId}`,
        "background: #FF9800; color: white; padding: 3px; border-radius: 3px;"
      );

      // Force refetch for the space's pages
      queryClient.refetchQueries({
        queryKey: ["spacePages", event.spaceId],
      });

      // Also refetch the space itself (may need to update page counts)
      queryClient.refetchQueries({
        queryKey: ["space", event.spaceId],
      });
    }

    // Handle page tree for created, deleted or moved pages
    if (
      event.type === MCPEventType.CREATED ||
      event.type === MCPEventType.DELETED ||
      event.type === MCPEventType.MOVED ||
      event.type === MCPEventType.UPDATED
    ) {
      console.log(
        `%c[MCP-HANDLER] 🔄 IMMEDIATELY refetching page tree data`,
        "background: #FF9800; color: white; padding: 3px; border-radius: 3px;"
      );

      // Force refetch for page tree with highest priority
      queryClient.refetchQueries({
        queryKey: ["pageTree"],
      });

      // For created pages, use a special approach
      if (event.type === MCPEventType.CREATED) {
        console.log(
          `%c[MCP-HANDLER] 🚨 NEW PAGE CREATED - forcing immediate refresh of all related queries`,
          "background: #F44336; color: white; padding: 3px; border-radius: 3px; font-weight: bold;"
        );

        if (event.spaceId) {
          // Try to get the current pages data for this space
          const pagesData = queryClient.getQueryData([
            "spacePages",
            event.spaceId,
          ]) as any;

          // If we have the new page data in the event, add it directly to the cache
          if (event.data && pagesData?.items) {
            console.log(
              `%c[MCP-HANDLER] 📝 Directly updating pages cache with new page`,
              "background: #9C27B0; color: white; padding: 3px; border-radius: 3px;"
            );

            // Only add if not already present
            const pageExists = pagesData.items.some(
              (page: any) => page.id === event.resourceId
            );

            if (!pageExists && event.data) {
              // Add the new page to the beginning of the list
              pagesData.items = [event.data, ...pagesData.items];

              // Update total count
              if (pagesData.total !== undefined) {
                pagesData.total += 1;
              }

              // Update the cache directly
              queryClient.setQueryData(
                ["spacePages", event.spaceId],
                pagesData
              );
            }
          }

          // Also update the recent changes cache
          const recentChangesData = queryClient.getQueryData([
            "recent-changes",
            event.spaceId,
          ]) as any;

          if (event.data && recentChangesData?.items) {
            console.log(
              `%c[MCP-HANDLER] 📝 Directly updating recent changes cache with new page`,
              "background: #9C27B0; color: white; padding: 3px; border-radius: 3px;"
            );

            // Only add if not already present
            const pageExists = recentChangesData.items.some(
              (page: any) => page.id === event.resourceId
            );

            if (!pageExists && event.data) {
              // Add the new page to the beginning of the list
              recentChangesData.items = [
                event.data,
                ...recentChangesData.items,
              ];

              // Update total count
              if (recentChangesData.total !== undefined) {
                recentChangesData.total += 1;
              }

              // Update the cache directly
              queryClient.setQueryData(
                ["recent-changes", event.spaceId],
                recentChangesData
              );
            }
          }

          // Also update the global recent changes cache
          const globalRecentChangesData = queryClient.getQueryData([
            "recent-changes",
            undefined,
          ]) as any;

          if (event.data && globalRecentChangesData?.items) {
            console.log(
              `%c[MCP-HANDLER] 📝 Directly updating global recent changes cache with new page`,
              "background: #9C27B0; color: white; padding: 3px; border-radius: 3px;"
            );

            // Only add if not already present
            const pageExists = globalRecentChangesData.items.some(
              (page: any) => page.id === event.resourceId
            );

            if (!pageExists && event.data) {
              // Add the new page to the beginning of the list
              globalRecentChangesData.items = [
                event.data,
                ...globalRecentChangesData.items,
              ];

              // Update total count
              if (globalRecentChangesData.total !== undefined) {
                globalRecentChangesData.total += 1;
              }

              // Update the cache directly
              queryClient.setQueryData(
                ["recent-changes", undefined],
                globalRecentChangesData
              );
            }
          }
        }
      }

      // Handle updated pages - update in recent changes list
      if (
        event.type === MCPEventType.UPDATED &&
        event.spaceId &&
        event.resourceId
      ) {
        console.log(
          `%c[MCP-HANDLER] 🔄 Updating page in recent changes`,
          "background: #FF9800; color: white; padding: 3px; border-radius: 3px;"
        );

        // Update in space-specific recent changes
        const recentChangesData = queryClient.getQueryData([
          "recent-changes",
          event.spaceId,
        ]) as any;

        if (event.data && recentChangesData?.items) {
          const pageIndex = recentChangesData.items.findIndex(
            (page: any) => page.id === event.resourceId
          );

          if (pageIndex !== -1 && event.data) {
            // Update the page data and move it to the beginning of the list
            recentChangesData.items.splice(pageIndex, 1);
            recentChangesData.items = [event.data, ...recentChangesData.items];

            // Update the cache directly
            queryClient.setQueryData(
              ["recent-changes", event.spaceId],
              recentChangesData
            );
          }
        }

        // Update in global recent changes
        const globalRecentChangesData = queryClient.getQueryData([
          "recent-changes",
          undefined,
        ]) as any;

        if (event.data && globalRecentChangesData?.items) {
          const pageIndex = globalRecentChangesData.items.findIndex(
            (page: any) => page.id === event.resourceId
          );

          if (pageIndex !== -1 && event.data) {
            // Update the page data and move it to the beginning of the list
            globalRecentChangesData.items.splice(pageIndex, 1);
            globalRecentChangesData.items = [
              event.data,
              ...globalRecentChangesData.items,
            ];

            // Update the cache directly
            queryClient.setQueryData(
              ["recent-changes", undefined],
              globalRecentChangesData
            );
          }
        }
      }
    }

    // Also refetch any active navigation-related queries
    console.log(
      `%c[MCP-HANDLER] 🔄 Refetching navigation and breadcrumb data`,
      "background: #2196F3; color: white; padding: 3px; border-radius: 3px;"
    );

    queryClient.refetchQueries({
      queryKey: ["navigation"],
    });

    queryClient.refetchQueries({
      queryKey: ["breadcrumbs"],
    });

    // Refresh recent changes queries for space home page
    console.log(
      `%c[MCP-HANDLER] 🔄 Refetching recent changes for space home page`,
      "background: #2196F3; color: white; padding: 3px; border-radius: 3px;"
    );

    // Global recent changes (all spaces)
    queryClient.refetchQueries({
      queryKey: ["recent-changes", undefined],
    });

    // Space-specific recent changes
    if (event.spaceId) {
      queryClient.refetchQueries({
        queryKey: ["recent-changes", event.spaceId],
      });
    }
  };

  // Function to handle space events
  const handleSpaceEvent = (event: MCPEvent) => {
    console.log(
      `%c[MCP-HANDLER] Handling SPACE event ${event.type}`,
      "background: #4CAF50; color: white; padding: 3px; border-radius: 3px;"
    );

    // Always refetch spaces data immediately
    console.log(
      `%c[MCP-HANDLER] 🔄 IMMEDIATELY refetching spaces list`,
      "background: #FF9800; color: white; padding: 3px; border-radius: 3px;"
    );

    // Force refetch spaces data with highest priority
    queryClient.refetchQueries({
      queryKey: ["spaces"],
      type: "all",
      exact: false,
    });

    if (event.resourceId) {
      // Handle specific space
      console.log(
        `%c[MCP-HANDLER] 🔄 IMMEDIATELY refetching space ${event.resourceId}`,
        "background: #FF9800; color: white; padding: 3px; border-radius: 3px;"
      );

      // Force refetch the specific space with highest priority
      queryClient.refetchQueries({
        queryKey: ["space", event.resourceId],
      });

      // Handle by slug if it's in the event data
      if (event.data?.slug) {
        console.log(
          `%c[MCP-HANDLER] 🔄 IMMEDIATELY refetching space with slug ${event.data.slug}`,
          "background: #FF9800; color: white; padding: 3px; border-radius: 3px;"
        );

        // Force refetch by slug
        queryClient.refetchQueries({
          queryKey: ["space", "slug", event.data.slug],
        });
      }
    }

    // Handle space permissions
    console.log(
      `%c[MCP-HANDLER] 🔄 Refetching space permissions`,
      "background: #2196F3; color: white; padding: 3px; border-radius: 3px;"
    );
    queryClient.refetchQueries({
      queryKey: ["spacePermissions"],
    });

    // Handle page tree
    console.log(
      `%c[MCP-HANDLER] 🔄 Refetching page tree data`,
      "background: #2196F3; color: white; padding: 3px; border-radius: 3px;"
    );
    queryClient.refetchQueries({
      queryKey: ["pageTree"],
    });

    // For created spaces, use a special approach
    if (event.type === MCPEventType.CREATED) {
      console.log(
        `%c[MCP-HANDLER] 🚨 NEW SPACE CREATED - forcing immediate refresh of all space-related queries`,
        "background: #F44336; color: white; padding: 3px; border-radius: 3px; font-weight: bold;"
      );

      // Refetch all queries that might display spaces
      queryClient.refetchQueries({
        queryKey: ["homepage"],
      });

      queryClient.refetchQueries({
        queryKey: ["dashboard"],
      });

      // Get the current spaces data
      const spacesData = queryClient.getQueryData(["spaces"]) as any;

      // If we have the new space data in the event, add it directly to the cache
      if (event.data && spacesData?.items) {
        console.log(
          `%c[MCP-HANDLER] 📝 Directly updating spaces cache with new space`,
          "background: #9C27B0; color: white; padding: 3px; border-radius: 3px;"
        );

        // Only add if not already present
        const spaceExists = spacesData.items.some(
          (space: any) => space.id === event.resourceId
        );

        if (!spaceExists && event.data) {
          // Add the new space to the beginning of the list
          spacesData.items = [event.data, ...spacesData.items];

          // Update total count
          if (spacesData.total !== undefined) {
            spacesData.total += 1;
          }

          // Update the cache directly
          queryClient.setQueryData(["spaces"], spacesData);
        }
      }
    }
  };

  // Function to handle comment events
  const handleCommentEvent = (event: MCPEvent) => {
    console.log(`%c[MCP-HANDLER] Handling COMMENT event`, "color: #4CAF50;");
    console.log(
      `%c[MCP-HANDLER] Invalidating comment queries`,
      "color: #4CAF50;"
    );

    // Comments are usually associated with a page
    if (event.data?.pageId) {
      console.log(
        `%c[MCP-HANDLER] Invalidating comments for page ${event.data.pageId}`,
        "color: #4CAF50;"
      );
      queryClient.invalidateQueries({
        queryKey: ["comments", event.data.pageId],
      });
    }

    // Also invalidate by comment ID
    if (event.resourceId) {
      console.log(
        `%c[MCP-HANDLER] Invalidating comment ${event.resourceId}`,
        "color: #4CAF50;"
      );
      queryClient.invalidateQueries({
        queryKey: ["comment", event.resourceId],
      });
    }

    // Update the general comments collection
    queryClient.invalidateQueries({ queryKey: ["comments"] });
  };

  // Function to handle attachment events
  const handleAttachmentEvent = (event: MCPEvent) => {
    console.log(`%c[MCP-HANDLER] Handling ATTACHMENT event`, "color: #4CAF50;");
    console.log(
      `%c[MCP-HANDLER] Invalidating attachment queries`,
      "color: #4CAF50;"
    );

    // Invalidate all attachments
    queryClient.invalidateQueries({ queryKey: ["attachments"] });

    // Invalidate by ID if available
    if (event.resourceId) {
      console.log(
        `%c[MCP-HANDLER] Invalidating attachment ${event.resourceId}`,
        "color: #4CAF50;"
      );
      queryClient.invalidateQueries({
        queryKey: ["attachment", event.resourceId],
      });
    }

    // If attachment is associated with a space
    if (event.spaceId) {
      console.log(
        `%c[MCP-HANDLER] Invalidating attachments for space ${event.spaceId}`,
        "color: #4CAF50;"
      );
      queryClient.invalidateQueries({
        queryKey: ["attachments", { spaceId: event.spaceId }],
      });
    }

    // If attachment is associated with a page
    if (event.data?.pageId) {
      console.log(
        `%c[MCP-HANDLER] Invalidating attachments for page ${event.data.pageId}`,
        "color: #4CAF50;"
      );
      queryClient.invalidateQueries({
        queryKey: ["attachments", { pageId: event.data.pageId }],
      });
    }
  };

  // Function to handle group events
  const handleGroupEvent = (event: MCPEvent) => {
    console.log(`%c[MCP-HANDLER] Handling GROUP event`, "color: #4CAF50;");
    console.log(
      `%c[MCP-HANDLER] Invalidating group queries`,
      "color: #4CAF50;"
    );

    // Invalidate all groups
    queryClient.invalidateQueries({ queryKey: ["groups"] });

    if (event.resourceId) {
      console.log(
        `%c[MCP-HANDLER] Invalidating group ${event.resourceId}`,
        "color: #4CAF50;"
      );
      queryClient.invalidateQueries({
        queryKey: ["group", event.resourceId],
      });

      // Group members may have changed
      queryClient.invalidateQueries({
        queryKey: ["groupMembers", event.resourceId],
      });
    }

    // Group changes may affect space permissions
    queryClient.invalidateQueries({ queryKey: ["spacePermissions"] });
  };

  // Function to handle user events
  const handleUserEvent = (event: MCPEvent) => {
    console.log(`%c[MCP-HANDLER] Handling USER event`, "color: #4CAF50;");
    console.log(`%c[MCP-HANDLER] Invalidating user queries`, "color: #4CAF50;");

    // Invalidate all users
    queryClient.invalidateQueries({ queryKey: ["users"] });

    if (event.resourceId) {
      console.log(
        `%c[MCP-HANDLER] Invalidating user ${event.resourceId}`,
        "color: #4CAF50;"
      );
      queryClient.invalidateQueries({
        queryKey: ["user", event.resourceId],
      });

      // May need to update current user info
      queryClient.invalidateQueries({
        queryKey: ["currentUser"],
      });
    }

    // User changes may affect space permissions
    queryClient.invalidateQueries({ queryKey: ["spacePermissions"] });
  };

  // Function to handle workspace events
  const handleWorkspaceEvent = (event: MCPEvent) => {
    console.log(`%c[MCP-HANDLER] Handling WORKSPACE event`, "color: #4CAF50;");
    console.log(
      `%c[MCP-HANDLER] Invalidating workspace queries`,
      "color: #4CAF50;"
    );

    // Invalidate all workspace-related queries
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });

    // Invalidate the specific workspace
    if (event.resourceId) {
      console.log(
        `%c[MCP-HANDLER] Invalidating workspace ${event.resourceId}`,
        "color: #4CAF50;"
      );
      queryClient.invalidateQueries({
        queryKey: ["workspace", event.resourceId],
      });

      // Force refetch for the specific workspace
      queryClient.refetchQueries({
        queryKey: ["workspace", event.resourceId],
        exact: true,
      });
    }

    // Workspace changes may affect user roles and permissions
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["permissions"] });

    // Force UI update by refetching all active workspace queries
    console.log(
      `%c[MCP-HANDLER] Force refetching active workspace queries`,
      "color: #4CAF50;"
    );
    queryClient.refetchQueries({
      queryKey: ["workspaces"],
      type: "active",
    });

    // Also refetch current user data
    queryClient.refetchQueries({
      queryKey: ["currentUser"],
      type: "active",
    });
  };
};
