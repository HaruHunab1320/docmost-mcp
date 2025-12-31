import {
  ActionIcon,
  Group,
  Menu,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { spotlight } from "@mantine/spotlight";
import {
  IconArrowDown,
  IconChecklist,
  IconInbox,
  IconCalendar,
  IconListCheck,
  IconClipboardList,
  IconClock,
  IconCloud,
  IconChevronDown,
  IconChevronRight,
  IconDots,
  IconFileExport,
  IconFolder,
  IconHome,
  IconPaperclip,
  IconPlus,
  IconSearch,
  IconSettings,
  IconChartDots,
} from "@tabler/icons-react";

import classes from "./space-sidebar.module.css";
import React, { useState } from "react";
import { useAtom } from "jotai";
import { SearchSpotlight } from "@/features/search/search-spotlight.tsx";
import { treeApiAtom } from "@/features/page/tree/atoms/tree-api-atom.ts";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { useDisclosure } from "@mantine/hooks";
import SpaceSettingsModal from "@/features/space/components/settings-modal.tsx";
import {
  useGetSpaceBySlugQuery,
  useSpaceQuery,
} from "@/features/space/queries/space-query.ts";
import { getSpaceUrl } from "@/lib/config.ts";
import SpaceTree from "@/features/page/tree/components/space-tree.tsx";
import { useSpaceAbility } from "@/features/space/permissions/use-space-ability.ts";
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from "@/features/space/permissions/permissions.type.ts";
import PageImportModal from "@/features/page/components/page-import-modal.tsx";
import { useTranslation } from "react-i18next";
import { SwitchSpace } from "./switch-space";
import { SpaceSelect } from "./space-select";
import ExportModal from "@/components/common/export-modal";
import APP_ROUTE from "@/lib/app-route";
import { useProjects } from "@/features/project/hooks/use-projects";
import { Project } from "@/features/project/types";
import { ProjectLinkedPages } from "@/features/project/components/project-linked-pages";
import { getProjectsArray } from "@/features/project/utils/project-data";
import { useQuery } from "@tanstack/react-query";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom";

export function SpaceSidebar() {
  const { t } = useTranslation();
  const [tree] = useAtom(treeApiAtom);
  const [workspace] = useAtom(workspaceAtom);
  const location = useLocation();
  const [opened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const { spaceSlug, spaceId } = useParams();
  const spaceIdFromQuery = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("spaceId") || undefined;
  }, [location.search]);
  const effectiveSpaceId = spaceId || spaceIdFromQuery;
  const { data: spaceBySlug } = useGetSpaceBySlugQuery(spaceSlug || "");
  const { data: spaceById } = useSpaceQuery(effectiveSpaceId || "");
  const space = spaceBySlug || spaceById;
  const resolvedSpaceSlug = spaceSlug || space?.slug;
  const navigate = useNavigate();
  const { data: projectsData } = useProjects({ spaceId: space?.id });
  const [expandedProjects, setExpandedProjects] = useState<
    Record<string, boolean>
  >({});
  const pinnedEntitiesQuery = useQuery({
    queryKey: ["sidebar-entity-pins", space?.id],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId: workspace?.id || "",
        spaceId: space?.id || "",
        tags: ["entity-pin"],
        limit: 20,
      }),
    enabled: !!space?.id && !!workspace?.id,
  });

  const spaceRules = space?.membership?.permissions;
  const spaceAbility = useSpaceAbility(spaceRules);

  const projects: Project[] = getProjectsArray(projectsData);
  const projectHomePageIds = projects
    .map((project) => project.homePageId)
    .filter((id): id is string => Boolean(id));

  const pinnedEntities = React.useMemo(() => {
    const records = pinnedEntitiesQuery.data || [];
    const latest = new Map<
      string,
      { action: string; name?: string; ts: number }
    >();
    records.forEach((record) => {
      const content = record.content as Record<string, any> | undefined;
      if (!content?.entityId) return;
      const ts = record.timestamp ? new Date(record.timestamp).getTime() : 0;
      const existing = latest.get(content.entityId);
      if (!existing || ts >= existing.ts) {
        latest.set(content.entityId, {
          action: content.action,
          name: content.entityName,
          ts,
        });
      }
    });

    return Array.from(latest.entries())
      .filter(([, value]) => value.action === "pin")
      .map(([id, value]) => ({ id, name: value.name || "Entity" }));
  }, [pinnedEntitiesQuery.data]);

  if (!space) {
    return (
      <div className={classes.navbar}>
        <div
          className={classes.section}
          style={{
            border: "none",
            marginTop: 2,
            marginBottom: 3,
          }}
        >
          <Text size="sm" c="dimmed" mb="xs">
            {t("Select a space")}
          </Text>
          <SpaceSelect
            label={t("Select space")}
            onChange={(selected) => {
              if (!selected?.slug) return;
              navigate(getSpaceUrl(selected.slug));
            }}
            width={300}
            opened={true}
            clearable
          />
        </div>
      </div>
    );
  }

  function handleCreatePage() {
    tree?.create({ parentId: null, type: "internal", index: 0 });
  }

  return (
    <>
      <div className={classes.navbar}>
        <div
          className={classes.section}
          style={{
            border: "none",
            marginTop: 2,
            marginBottom: 3,
          }}
        >
          <SwitchSpace spaceName={space?.name} spaceSlug={space?.slug} />
        </div>

        <div className={classes.section}>
          <div className={classes.menuItems}>
            <UnstyledButton
              component={Link}
              to={resolvedSpaceSlug ? getSpaceUrl(resolvedSpaceSlug) : "#"}
              className={clsx(
                classes.menu,
                resolvedSpaceSlug &&
                  location.pathname.toLowerCase() ===
                    getSpaceUrl(resolvedSpaceSlug)
                  ? classes.activeButton
                  : ""
              )}
            >
              <div className={classes.menuItemInner}>
                <IconHome
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Overview")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton
              component={Link}
              to={APP_ROUTE.SPACE.INBOX(space.id)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${space.id}/inbox`)
                  ? classes.activeButton
                  : ""
              )}
            >
              <div className={classes.menuItemInner}>
                <IconInbox
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Inbox")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton
              component={Link}
              to={APP_ROUTE.SPACE.TODAY(space.id)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${space.id}/today`)
                  ? classes.activeButton
                  : ""
              )}
            >
              <div className={classes.menuItemInner}>
                <IconCalendar
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Today")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton
              component={Link}
              to={`/files?spaceId=${space.id}`}
              className={clsx(
                classes.menu,
                location.pathname === "/files" &&
                  location.search.includes(`spaceId=${space.id}`)
                  ? classes.activeButton
                  : ""
              )}
            >
              <div className={classes.menuItemInner}>
                <IconPaperclip
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Attachments")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton
              component={Link}
              to={APP_ROUTE.SPACE.TRIAGE(space.id)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${space.id}/triage`)
                  ? classes.activeButton
                  : ""
              )}
            >
              <div className={classes.menuItemInner}>
                <IconListCheck
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Triage")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton
              component={Link}
              to={APP_ROUTE.SPACE.REVIEW(space.id)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${space.id}/review`)
                  ? classes.activeButton
                  : ""
              )}
            >
              <div className={classes.menuItemInner}>
                <IconClipboardList
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Weekly Review")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton
              component={Link}
              to={APP_ROUTE.SPACE.INSIGHTS(space.id)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${space.id}/insights`)
                  ? classes.activeButton
                  : ""
              )}
            >
              <div className={classes.menuItemInner}>
                <IconChartDots
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Insights")}</span>
              </div>
            </UnstyledButton>

            {pinnedEntities.length ? (
              <div className={classes.subSection}>
                <Text size="xs" c="dimmed" fw={600} mb={4}>
                  {t("Pinned entities")}
                </Text>
                <Group gap={6} wrap="wrap">
                  {pinnedEntities.map((entity) => (
                    <UnstyledButton
                      key={entity.id}
                      component={Link}
                      to={`${APP_ROUTE.SPACE.INSIGHTS(space.id)}?entityId=${entity.id}`}
                      className={classes.subMenu}
                    >
                      <Text size="xs">{entity.name}</Text>
                    </UnstyledButton>
                  ))}
                </Group>
              </div>
            ) : null}

            <UnstyledButton
              component={Link}
              to={APP_ROUTE.SPACE.WAITING(space.id)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${space.id}/waiting`)
                  ? classes.activeButton
                  : ""
              )}
            >
              <div className={classes.menuItemInner}>
                <IconClock
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Waiting")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton
              component={Link}
              to={APP_ROUTE.SPACE.SOMEDAY(space.id)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${space.id}/someday`)
                  ? classes.activeButton
                  : ""
              )}
            >
              <div className={classes.menuItemInner}>
                <IconCloud
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Someday")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton
              component={Link}
              to={APP_ROUTE.SPACE.PROJECTS(space.id)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/s/${space.id}/projects`)
                  ? classes.activeButton
                  : ""
              )}
            >
              <div className={classes.menuItemInner}>
                <IconChecklist
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Projects")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton className={classes.menu} onClick={spotlight.open}>
              <div className={classes.menuItemInner}>
                <IconSearch
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Search")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton className={classes.menu} onClick={openSettings}>
              <div className={classes.menuItemInner}>
                <IconSettings
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Space settings")}</span>
              </div>
            </UnstyledButton>

            {spaceAbility.can(
              SpaceCaslAction.Manage,
              SpaceCaslSubject.Page
            ) && (
              <UnstyledButton
                className={classes.menu}
                onClick={handleCreatePage}
              >
                <div className={classes.menuItemInner}>
                  <IconPlus
                    size={18}
                    className={classes.menuItemIcon}
                    stroke={2}
                  />
                  <span>{t("New page")}</span>
                </div>
              </UnstyledButton>
            )}
          </div>
        </div>

        <div
          className={clsx(
            classes.section,
            classes.sectionPages,
            classes.sectionProjects
          )}
        >
          <Group className={classes.pagesHeader} justify="space-between">
            <Text size="xs" fw={500} c="dimmed">
              {t("Projects")}
            </Text>
          </Group>

          <div className={classes.pages}>
            {projects.length === 0 ? (
              <Text size="xs" c="dimmed" className={classes.projectEmpty}>
                {t("No projects yet")}
              </Text>
            ) : (
              projects.map((project) => {
                const isExpanded = !!expandedProjects[project.id];
                return (
                  <div key={project.id} className={classes.projectGroup}>
                    <div className={classes.projectRow}>
                      <ActionIcon
                        variant="subtle"
                        size={22}
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedProjects((prev) => ({
                            ...prev,
                            [project.id]: !isExpanded,
                          }));
                        }}
                        aria-label={
                          isExpanded
                            ? t("Collapse project")
                            : t("Expand project")
                        }
                      >
                        {isExpanded ? (
                          <IconChevronDown size={14} />
                        ) : (
                          <IconChevronRight size={14} />
                        )}
                      </ActionIcon>
                      <UnstyledButton
                        className={classes.projectLink}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(
                            `${APP_ROUTE.SPACE.PROJECTS(space.id)}?projectId=${project.id}`
                          );
                        }}
                      >
                        <Group gap={6} wrap="nowrap">
                          <IconFolder size={14} />
                          <Text size="sm" truncate>
                            {project.name}
                          </Text>
                        </Group>
                      </UnstyledButton>
                    </div>

                    {isExpanded && (
                      <ProjectLinkedPages
                        projectId={project.id}
                        homePageId={project.homePageId}
                        spaceSlug={space.slug}
                        spaceId={space.id}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={clsx(classes.section, classes.sectionPages)}>
          <Group className={classes.pagesHeader} justify="space-between">
            <Text size="xs" fw={500} c="dimmed">
              {t("Pages")}
            </Text>

            {spaceAbility.can(
              SpaceCaslAction.Manage,
              SpaceCaslSubject.Page
            ) && (
              <Group gap="xs">
                <SpaceMenu spaceId={space.id} onSpaceSettings={openSettings} />

                <Tooltip label={t("Create page")} withArrow position="right">
                  <ActionIcon
                    variant="subtle"
                    size={18}
                    onClick={handleCreatePage}
                    aria-label={t("Create page")}
                  >
                    <IconPlus />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
          </Group>

          <div className={classes.pages}>
            <SpaceTree
              spaceId={space.id}
              excludedPageIds={projectHomePageIds}
              readOnly={spaceAbility.cannot(
                SpaceCaslAction.Manage,
                SpaceCaslSubject.Page
              )}
            />
          </div>
        </div>
      </div>

      <SpaceSettingsModal
        opened={opened}
        onClose={closeSettings}
        spaceId={space?.slug}
      />

      <SearchSpotlight spaceId={space.id} />
    </>
  );
}

interface SpaceMenuProps {
  spaceId: string;
  onSpaceSettings: () => void;
}
function SpaceMenu({ spaceId, onSpaceSettings }: SpaceMenuProps) {
  const { t } = useTranslation();
  const [importOpened, { open: openImportModal, close: closeImportModal }] =
    useDisclosure(false);
  const [exportOpened, { open: openExportModal, close: closeExportModal }] =
    useDisclosure(false);

  return (
    <>
      <Menu width={200} shadow="md" withArrow>
        <Menu.Target>
          <Tooltip
            label={t("Import pages & space settings")}
            withArrow
            position="top"
          >
            <ActionIcon variant="subtle" size={18} aria-label={t("Space menu")}>
              <IconDots />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            onClick={openImportModal}
            leftSection={<IconArrowDown size={16} />}
          >
            {t("Import pages")}
          </Menu.Item>

          <Menu.Item
            onClick={openExportModal}
            leftSection={<IconFileExport size={16} />}
          >
            {t("Export space")}
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item
            onClick={onSpaceSettings}
            leftSection={<IconSettings size={16} />}
          >
            {t("Space settings")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <PageImportModal
        spaceId={spaceId}
        open={importOpened}
        onClose={closeImportModal}
      />

      <ExportModal
        type="space"
        id={spaceId}
        open={exportOpened}
        onClose={closeExportModal}
      />
    </>
  );
}
