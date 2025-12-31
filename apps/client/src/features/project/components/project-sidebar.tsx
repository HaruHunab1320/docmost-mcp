import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActionIcon,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
  Menu,
} from "@mantine/core";
import {
  IconChecklist,
  IconChevronRight,
  IconChevronDown,
  IconHome,
  IconInbox,
  IconCalendar,
  IconPaperclip,
  IconListCheck,
  IconClipboardList,
  IconChartDots,
  IconClock,
  IconCloud,
  IconPlus,
  IconSearch,
  IconSettings,
  IconDotsVertical,
  IconTrash,
  IconFolder,
  IconFolderFilled,
} from "@tabler/icons-react";
import classes from "../../space/components/sidebar/space-sidebar.module.css";
import APP_ROUTE from "@/lib/app-route";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useProjects, useDeleteProjectMutation } from "../hooks/use-projects";
import { Project } from "../types";
import { useSpaceQuery } from "@/features/space/queries/space-query";
import { getSpaceUrl } from "@/lib/config";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { spotlight } from "@mantine/spotlight";
import SpaceSettingsModal from "@/features/space/components/settings-modal";
import { SearchSpotlight } from "@/features/search/search-spotlight";
import ProjectFormModal from "./project-form-modal";
import { useCurrentWorkspace } from "@/features/workspace/hooks/use-current-workspace";
import { getProjectsArray } from "../utils/project-data";
import { ProjectLinkedPages } from "./project-linked-pages";
import SpaceTree from "@/features/page/tree/components/space-tree";
import { useSpaceAbility } from "@/features/space/permissions/use-space-ability";
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from "@/features/space/permissions/permissions.type";
import { treeApiAtom } from "@/features/page/tree/atoms/tree-api-atom";
import { useAtom } from "jotai";

interface ProjectSidebarProps {
  spaceId: string;
  activeProjectId?: string | null;
  onSelectProject: (project: Project) => void;
}

export function ProjectSidebar({
  spaceId,
  activeProjectId,
  onSelectProject,
}: ProjectSidebarProps) {
  const { t } = useTranslation();
  const { data: projectsData, isLoading } = useProjects({ spaceId });
  const deleteProjectMutation = useDeleteProjectMutation();
  const location = useLocation();
  const { data: space } = useSpaceQuery(spaceId);
  const { data: workspaceData } = useCurrentWorkspace();
  const [
    createModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);
  const [settingsOpened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [spacePagesExpanded, setSpacePagesExpanded] = useState(false);
  const [tree] = useAtom(treeApiAtom);

  const projects: Project[] = getProjectsArray(projectsData);
  const projectHomePageIds = projects
    .map((project) => project.homePageId)
    .filter((id): id is string => Boolean(id));
  const spaceRules = space?.membership?.permissions;
  const spaceAbility = useSpaceAbility(spaceRules);

  useEffect(() => {
    if (!activeProjectId) return;
    setExpandedProjects((prev) =>
      prev[activeProjectId] ? prev : { ...prev, [activeProjectId]: true }
    );
  }, [activeProjectId]);

  const handleDeleteProject = (project: Project) => {
    modals.openConfirmModal({
      title: t("Delete project"),
      children: (
        <>
          <Text size="sm" mb="md">
            {t(
              "Are you sure you want to delete this project? This action cannot be undone."
            )}
          </Text>
          <TextInput
            label={t("Type the project name to confirm")}
            placeholder={project.name}
            onChange={(e) => {
              if (e.target.value === project.name) {
                modals.closeAll();
                deleteProjectMutation.mutate({
                  projectId: project.id,
                  projectName: project.name,
                });
              }
            }}
          />
        </>
      ),
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {},
    });
  };

  // Memoize the ProjectFormModal component to avoid unnecessary re-renders
  const ProjectFormModalMemo = useMemo(
    () => (
      <ProjectFormModal
        opened={createModalOpened}
        onClose={closeCreateModal}
        spaceId={spaceId}
        workspaceId={workspaceData?.id || ""}
      />
    ),
    [createModalOpened, closeCreateModal, spaceId, workspaceData?.id]
  );

  return (
    <>
      <div className={classes.navbar}>
        {/* Space Name Section */}
        <div
          className={classes.section}
          style={{
            border: "none",
            marginTop: 2,
            marginBottom: 3,
          }}
        >
          {space && (
            <UnstyledButton
              component={Link}
              to={getSpaceUrl(space.slug)}
              className={classes.menu}
            >
              <div className={classes.menuItemInner}>
                <Text size="sm" fw={500}>
                  {space.name}
                </Text>
              </div>
            </UnstyledButton>
          )}
        </div>

        {/* Main Navigation Section */}
        <div className={classes.section}>
          <div className={classes.menuItems}>
            <UnstyledButton
              component={Link}
              to={space ? getSpaceUrl(space.slug) : `/s/${spaceId}/home`}
              className={clsx(
                classes.menu,
                location.pathname.toLowerCase() ===
                  (space ? getSpaceUrl(space.slug) : `/s/${spaceId}/home`)
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
              to={APP_ROUTE.SPACE.PROJECTS(spaceId)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/s/${spaceId}/projects`)
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

            <UnstyledButton
              component={Link}
              to={APP_ROUTE.SPACE.INBOX(spaceId)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${spaceId}/inbox`)
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
              to={APP_ROUTE.SPACE.TODAY(spaceId)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${spaceId}/today`)
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
              to={`/files?spaceId=${spaceId}`}
              className={clsx(
                classes.menu,
                location.pathname === "/files" &&
                  location.search.includes(`spaceId=${spaceId}`)
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
              to={APP_ROUTE.SPACE.TRIAGE(spaceId)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${spaceId}/triage`)
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
              to={APP_ROUTE.SPACE.REVIEW(spaceId)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${spaceId}/review`)
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
              to={APP_ROUTE.SPACE.INSIGHTS(spaceId)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${spaceId}/insights`)
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

            <UnstyledButton
              component={Link}
              to={APP_ROUTE.SPACE.WAITING(spaceId)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${spaceId}/waiting`)
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
              to={APP_ROUTE.SPACE.SOMEDAY(spaceId)}
              className={clsx(
                classes.menu,
                location.pathname.includes(`/spaces/${spaceId}/someday`)
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
                onClick={() => {
                  tree?.create({ parentId: null, type: "internal", index: 0 });
                }}
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

            <UnstyledButton className={classes.menu} onClick={openCreateModal}>
              <div className={classes.menuItemInner}>
                <IconPlus
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("New project")}</span>
              </div>
            </UnstyledButton>
          </div>
        </div>

        {/* Projects List Section */}
        <div className={clsx(classes.section, classes.sectionPages)}>
          <Group className={classes.pagesHeader} justify="space-between">
            <Text size="xs" fw={500} c="dimmed">
              {t("Projects")}
            </Text>
            <Tooltip label={t("Create project")} withArrow position="right">
              <ActionIcon
                variant="default"
                size={18}
                onClick={openCreateModal}
                aria-label={t("Create project")}
              >
                <IconPlus />
              </ActionIcon>
            </Tooltip>
          </Group>

          <ScrollArea
            h="calc(100vh - 300px)"
            type="auto"
            offsetScrollbars
            className={classes.pages}
          >
            <Stack gap="xs">
              {isLoading ? (
                <Text size="sm" c="dimmed">
                  {t("Loading...")}
                </Text>
              ) : projects.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t("No projects found")}
                </Text>
              ) : (
                projects.map((project) => {
                  const isExpanded = !!expandedProjects[project.id];
                  return (
                    <Stack key={project.id} gap={4}>
                      <Group wrap="nowrap" gap={0}>
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedProjects((prev) => ({
                              ...prev,
                              [project.id]: !isExpanded,
                            }));
                          }}
                          aria-label={
                            isExpanded ? t("Collapse project") : t("Expand project")
                          }
                        >
                          {isExpanded ? (
                            <IconChevronDown size={14} />
                          ) : (
                            <IconChevronRight size={14} />
                          )}
                        </ActionIcon>
                        <UnstyledButton
                          className={`${classes.menu} ${
                            activeProjectId === project.id
                              ? classes.activeButton
                              : ""
                          }`}
                          onClick={() => onSelectProject(project)}
                          style={{ flex: 1 }}
                        >
                          <div className={classes.menuItemInner}>
                            {activeProjectId === project.id ? (
                              <IconFolderFilled
                                size={16}
                                className={classes.menuItemIcon}
                                stroke={1.5}
                              />
                            ) : (
                              <IconFolder
                                size={16}
                                className={classes.menuItemIcon}
                                stroke={1.5}
                              />
                            )}
                            <Text size="sm" truncate>
                              {project.name}
                            </Text>
                          </div>
                        </UnstyledButton>
                        <Menu shadow="md" position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconDotsVertical size={14} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              color="red"
                              leftSection={<IconTrash size={14} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project);
                              }}
                            >
                              {t("Delete")}
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                      {isExpanded && space && (
                        <ProjectLinkedPages
                          projectId={project.id}
                          homePageId={project.homePageId}
                          spaceSlug={space.slug}
                          spaceId={space.id}
                        />
                      )}
                    </Stack>
                  );
                })
              )}
            </Stack>
          </ScrollArea>
        </div>

        <div className={clsx(classes.section, classes.sectionPages)}>
          <Group className={classes.pagesHeader} justify="space-between">
            <Group gap="xs" wrap="nowrap">
              <ActionIcon
                variant="subtle"
                size={18}
                onClick={() => setSpacePagesExpanded((prev) => !prev)}
                aria-label={
                  spacePagesExpanded
                    ? t("Collapse space pages")
                    : t("Expand space pages")
                }
              >
                {spacePagesExpanded ? (
                  <IconChevronDown size={14} />
                ) : (
                  <IconChevronRight size={14} />
                )}
              </ActionIcon>
              <Text size="xs" fw={500} c="dimmed">
                {t("Space pages")}
              </Text>
            </Group>

            {spacePagesExpanded &&
              spaceAbility?.can(
                SpaceCaslAction.Manage,
                SpaceCaslSubject.Page
              ) && (
                <Tooltip label={t("Create page")} withArrow position="right">
                  <ActionIcon
                    variant="subtle"
                    size={18}
                    onClick={() => {
                      tree?.create({ parentId: null, type: "internal", index: 0 });
                    }}
                    aria-label={t("Create page")}
                  >
                    <IconPlus />
                  </ActionIcon>
                </Tooltip>
              )}
          </Group>

          {spacePagesExpanded && space && (
            <div className={classes.pages}>
              <SpaceTree
                spaceId={space.id}
                excludedPageIds={projectHomePageIds}
                readOnly={spaceAbility?.cannot(
                  SpaceCaslAction.Manage,
                  SpaceCaslSubject.Page
                )}
              />
            </div>
          )}
        </div>
      </div>

      {/* Project Create Modal */}
      {ProjectFormModalMemo}

      {space && (
        <SpaceSettingsModal
          opened={settingsOpened}
          onClose={closeSettings}
          spaceId={space.id}
        />
      )}

      {/* Add the SearchSpotlight component for search functionality */}
      {space && <SearchSpotlight spaceId={space.id} />}
    </>
  );
}
