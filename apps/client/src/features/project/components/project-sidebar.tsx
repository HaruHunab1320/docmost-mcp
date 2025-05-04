import { useState } from "react";
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
  IconHome,
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

  // Handle both possible structures from the API
  let projects: Project[] = [];
  if (projectsData) {
    if (Array.isArray(projectsData.data)) {
      // Structure: { data: Project[], pagination: {...} }
      projects = projectsData.data;
    } else if (Array.isArray(projectsData.items)) {
      // Structure: { items: Project[], meta: {...} }
      projects = projectsData.items;
    }
  }

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
                projects.map((project) => (
                  <Group key={project.id} wrap="nowrap" gap={0}>
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
                ))
              )}
            </Stack>
          </ScrollArea>
        </div>
      </div>

      {/* Project Create Modal */}
      <ProjectFormModal
        opened={createModalOpened}
        onClose={closeCreateModal}
        spaceId={spaceId}
        workspaceId={workspaceData?.id || ""}
      />

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
