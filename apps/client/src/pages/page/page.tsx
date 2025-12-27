import { useParams } from "react-router-dom";
import { usePageQuery } from "@/features/page/queries/page-query";
import { FullEditor } from "@/features/editor/full-editor";
import HistoryModal from "@/features/page-history/components/history-modal";
import { Helmet } from "react-helmet-async";
import PageHeader from "@/features/page/components/header/page-header.tsx";
import { extractPageSlugId } from "@/lib";
import { buildPageUrl } from "@/features/page/page.utils";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query.ts";
import { useSpaceAbility } from "@/features/space/permissions/use-space-ability.ts";
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from "@/features/space/permissions/permissions.type.ts";
import { useTranslation } from "react-i18next";
import { Error404 } from "@/components/ui/error-404.tsx";
import { useCallback, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { mcpSocketAtom } from "@/features/websocket/atoms/mcp-socket-atom";
import {
  MCPEventType,
  MCPResourceType,
} from "@/features/websocket/types/mcp-event.types";
import { Loader } from "@mantine/core";
import { usePageTabs } from "@/features/page/hooks/use-page-tabs";

export default function Page() {
  const { t } = useTranslation();
  const { pageSlug } = useParams();
  const [socket] = useAtom(mcpSocketAtom);
  const pageId = extractPageSlugId(pageSlug);
  const [refreshing, setRefreshing] = useState(false);
  const { upsertTab } = usePageTabs();

  const {
    data: page,
    isLoading,
    isError,
    error,
    refetch,
  } = usePageQuery({ pageId });

  const { data: space, refetch: refetchSpace } = useGetSpaceBySlugQuery(
    page?.space?.slug
  );

  const spaceRules = space?.membership?.permissions;
  const spaceAbility = useSpaceAbility(spaceRules);

  // Handle immediate refetch when this page is updated
  const handlePageEvent = useCallback(
    (event) => {
      if (
        event.resource === MCPResourceType.PAGE &&
        event.resourceId === pageId &&
        (event.type === MCPEventType.UPDATED ||
          event.type === MCPEventType.MOVED)
      ) {
        console.log(
          "🔄 PageView: Page update event detected, refreshing page...",
          event
        );
        setRefreshing(true);

        // Force refetch the page data
        Promise.all([refetch(), refetchSpace()]).finally(() => {
          setRefreshing(false);
        });
      }
    },
    [pageId, refetch, refetchSpace]
  );

  // Register for direct MCP events
  useEffect(() => {
    if (socket) {
      console.log(
        "🔗 PageView: Setting up MCP event listener for page:",
        pageId
      );

      // Listen directly for MCP events related to this page
      socket.on("mcp:event", handlePageEvent);

      // Also subscribe to specific page events if not already subscribed
      socket.emit("mcp:subscribe", {
        resourceType: MCPResourceType.PAGE,
        resourceId: pageId,
      });

      return () => {
        socket.off("mcp:event", handlePageEvent);
      };
    }
  }, [socket, pageId, handlePageEvent]);

  useEffect(() => {
    if (!page || !space?.slug) return;
    upsertTab({
      id: page.id,
      title: page.title || t("untitled"),
      url: buildPageUrl(space.slug, page.slugId || page.id, page.title),
      icon: page.icon,
    });
  }, [page, space?.slug, t, upsertTab]);

  if (isLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "50px" }}
      >
        <Loader size="md" />
      </div>
    );
  }

  if (isError || !page) {
    console.error("Error loading page:", error);
    return <Error404 />;
  }

  if (!space) {
    console.error("Space not found for page:", page);
    return <Error404 />;
  }

  return (
    <div>
      <Helmet>
        <title>{`${page?.icon || ""}  ${page?.title || t("untitled")}`}</title>
      </Helmet>

      <PageHeader
        readOnly={spaceAbility.cannot(
          SpaceCaslAction.Manage,
          SpaceCaslSubject.Page
        )}
      />

      {refreshing && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            right: "20px",
            zIndex: 1000,
          }}
        >
          <Loader size="sm" />
        </div>
      )}

      <FullEditor
        key={page.id}
        pageId={page.id}
        title={page.title}
        content={page.content}
        slugId={page.slugId}
        spaceSlug={page?.space?.slug}
        editable={spaceAbility.can(
          SpaceCaslAction.Manage,
          SpaceCaslSubject.Page
        )}
      />
      <HistoryModal pageId={page.id} />
    </div>
  );
}
