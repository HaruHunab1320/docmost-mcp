import { useEffect, useMemo, useState } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useTasksByProject } from "../hooks/use-tasks";
import { getPageById } from "@/features/page/services/page-service";
import { buildPageUrl } from "@/features/page/page.utils";
import classes from "@/features/space/components/sidebar/space-sidebar.module.css";

interface ProjectLinkedPagesProps {
  projectId: string;
  homePageId?: string | null;
  spaceSlug: string;
}

interface ProjectLinkedPage {
  id: string;
  name: string;
  url: string;
}

export function ProjectLinkedPages({
  projectId,
  homePageId,
  spaceSlug,
}: ProjectLinkedPagesProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pages, setPages] = useState<ProjectLinkedPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const { data: tasksData, isLoading: isTasksLoading } = useTasksByProject({
    projectId,
    page: 1,
    limit: 200,
  });

  const pageIds = useMemo(() => {
    const taskPageIds = (tasksData?.items || [])
      .map((task) => task.pageId)
      .filter((pageId): pageId is string => Boolean(pageId));
    const combined = homePageId ? [homePageId, ...taskPageIds] : taskPageIds;
    return Array.from(new Set(combined));
  }, [homePageId, tasksData?.items]);

  useEffect(() => {
    if (!pageIds.length) {
      setPages([]);
      return;
    }

    let isActive = true;
    setIsLoadingPages(true);

    Promise.all(pageIds.map((pageId) => getPageById({ pageId })))
      .then((pagesResult) => {
        if (!isActive) return;
        const nextPages = pagesResult
          .filter(Boolean)
          .map((page) => ({
            id: page.id,
            name: page.title || t("Untitled"),
            url: buildPageUrl(spaceSlug, page.slugId || page.id, page.title),
          }));
        setPages(nextPages);
      })
      .catch(() => {
        if (!isActive) return;
        notifications.show({
          message: t("Failed to load project pages"),
          color: "red",
        });
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingPages(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [pageIds, spaceSlug, t]);

  if (isTasksLoading || isLoadingPages) {
    return (
      <Text size="xs" c="dimmed" className={classes.projectEmpty}>
        {t("Loading pages...")}
      </Text>
    );
  }

  if (!pages.length) {
    return (
      <Text size="xs" c="dimmed" className={classes.projectEmpty}>
        {t("No linked pages")}
      </Text>
    );
  }

  return (
    <Stack gap={4} className={classes.projectChildren}>
      {pages.map((page) => (
        <Group
          key={page.id}
          gap={6}
          className={classes.projectPageItem}
          onClick={() => navigate(page.url)}
        >
          <IconFileText size={14} />
          <Text size="xs" truncate>
            {page.name}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}
