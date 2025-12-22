import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconFileText, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useTasksByProject } from "../hooks/use-tasks";
import { getPageById, getSidebarPages } from "@/features/page/services/page-service";
import { buildPageUrl } from "@/features/page/page.utils";
import classes from "@/features/space/components/sidebar/space-sidebar.module.css";
import { useCreateProjectPageMutation } from "@/features/project/hooks/use-projects";
import { createPage } from "@/features/page/services/page-service";
import { useUpdatePageMutation } from "@/features/page/queries/page-query";

interface ProjectLinkedPagesProps {
  projectId: string;
  homePageId?: string | null;
  spaceSlug: string;
  spaceId: string;
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
  spaceId,
}: ProjectLinkedPagesProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pages, setPages] = useState<ProjectLinkedPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [suppressNavigation, setSuppressNavigation] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const createProjectPageMutation = useCreateProjectPageMutation();
  const updatePageMutation = useUpdatePageMutation();
  const { data: tasksData, isLoading: isTasksLoading } = useTasksByProject({
    projectId,
    page: 1,
    limit: 200,
  });

  const taskPageIds = useMemo(() => {
    return (tasksData?.items || [])
      .map((task) => task.pageId)
      .filter((pageId): pageId is string => Boolean(pageId));
  }, [tasksData?.items]);

  useEffect(() => {
    let isActive = true;
    const loadPages = async () => {
      setIsLoadingPages(true);
      try {
        const pageMap = new Map<string, ProjectLinkedPage>();

        if (homePageId) {
          const [homePage, children] = await Promise.all([
            getPageById({ pageId: homePageId }).catch(() => null),
            getSidebarPages({ spaceId, pageId: homePageId, page: 1 }).catch(
              () => ({ items: [] })
            ),
          ]);

          if (homePage) {
            pageMap.set(homePage.id, {
              id: homePage.id,
              name: homePage.title || t("Untitled"),
              url: buildPageUrl(
                spaceSlug,
                homePage.slugId || homePage.id,
                homePage.title
              ),
            });
          }

          (children.items || []).forEach((child) => {
            pageMap.set(child.id, {
              id: child.id,
              name: child.title || t("Untitled"),
              url: buildPageUrl(
                spaceSlug,
                child.slugId || child.id,
                child.title
              ),
            });
          });
        }

        const missingTaskPages = taskPageIds.filter(
          (pageId) => !pageMap.has(pageId)
        );
        if (missingTaskPages.length) {
          const taskPages = await Promise.all(
            missingTaskPages.map((pageId) => getPageById({ pageId }).catch(() => null))
          );
          taskPages
            .filter(Boolean)
            .forEach((page) => {
              pageMap.set(page.id, {
                id: page.id,
                name: page.title || t("Untitled"),
                url: buildPageUrl(
                  spaceSlug,
                  page.slugId || page.id,
                  page.title
                ),
              });
            });
        }

        if (!isActive) return;
        setPages(Array.from(pageMap.values()));
      } catch (error) {
        if (!isActive) return;
        notifications.show({
          message: t("Failed to load project pages"),
          color: "red",
        });
      } finally {
        if (isActive) {
          setIsLoadingPages(false);
        }
      }
    };

    if (!homePageId && taskPageIds.length === 0) {
      setPages([]);
      return;
    }

    loadPages();

    return () => {
      isActive = false;
    };
  }, [homePageId, spaceId, spaceSlug, t, taskPageIds]);

  const handleAddPage = async () => {
    if (!spaceId) return;
    setIsCreatingPage(true);
    setSuppressNavigation(true);
    try {
      let targetHomePageId = homePageId;
      if (!targetHomePageId) {
        const project = await createProjectPageMutation.mutateAsync(projectId);
        targetHomePageId = project.homePageId || null;
      }
      if (!targetHomePageId) return;
      const newPage = await createPage({
        title: t("New page"),
        spaceId,
        parentPageId: targetHomePageId,
      });
      setPages((prev) => {
        if (prev.some((page) => page.id === newPage.id)) return prev;
        return [
          ...prev,
          {
            id: newPage.id,
            name: newPage.title || t("Untitled"),
            url: buildPageUrl(
              spaceSlug,
              newPage.slugId || newPage.id,
              newPage.title
            ),
          },
        ];
      });
      setEditingPageId(newPage.id);
      setDraftTitle(newPage.title || t("New page"));
    } finally {
      setIsCreatingPage(false);
      setTimeout(() => setSuppressNavigation(false), 300);
    }
  };

  const commitTitle = async (pageId: string) => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) return;
    try {
      await updatePageMutation.mutateAsync({ pageId, title: nextTitle });
      setPages((prev) =>
        prev.map((page) =>
          page.id === pageId ? { ...page, name: nextTitle } : page
        )
      );
    } catch (error) {
      notifications.show({
        message: t("Failed to update page title"),
        color: "red",
      });
    } finally {
      setEditingPageId(null);
    }
  };

  if (isTasksLoading || isLoadingPages) {
    return (
      <Text size="xs" c="dimmed" className={classes.projectEmpty}>
        {t("Loading pages...")}
      </Text>
    );
  }

  if (!pages.length) {
    return (
      <Stack gap={4} className={classes.projectChildren}>
        <Text size="xs" c="dimmed" className={classes.projectEmpty}>
          {t("No linked pages")}
        </Text>
        <Tooltip label={t("Add page")} withArrow>
          <UnstyledButton
            className={classes.projectPageItem}
            onClick={handleAddPage}
            disabled={isCreatingPage}
          >
            <Group gap={6} wrap="nowrap">
              <IconPlus size={14} />
              <Text size="xs">{t("Add page")}</Text>
            </Group>
          </UnstyledButton>
        </Tooltip>
      </Stack>
    );
  }

  return (
    <Stack gap={4} className={classes.projectChildren}>
      {pages.map((page) => (
        <Group
          key={page.id}
          gap={6}
          className={classes.projectPageItem}
          onClick={() => {
            if (suppressNavigation) return;
            if (editingPageId === page.id) return;
            navigate(page.url);
          }}
        >
          <IconFileText size={14} />
          {editingPageId === page.id ? (
            <TextInput
              size="xs"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.currentTarget.value)}
              onBlur={() => commitTitle(page.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitTitle(page.id);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setEditingPageId(null);
                }
              }}
              autoFocus
              styles={{
                input: { height: 22, minHeight: 22, paddingTop: 0, paddingBottom: 0 },
              }}
            />
          ) : (
            <Text size="xs" truncate>
              {page.name}
            </Text>
          )}
        </Group>
      ))}
      <Tooltip label={t("Add page")} withArrow>
        <UnstyledButton
          className={classes.projectPageItem}
          onClick={handleAddPage}
          disabled={isCreatingPage}
        >
          <Group gap={6} wrap="nowrap">
            <IconPlus size={14} />
            <Text size="xs">{t("Add page")}</Text>
          </Group>
        </UnstyledButton>
      </Tooltip>
    </Stack>
  );
}
