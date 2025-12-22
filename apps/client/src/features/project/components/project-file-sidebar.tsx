import {
  ActionIcon,
  Group,
  Menu,
  Text,
  Tooltip,
  UnstyledButton,
  Button,
  Avatar,
  Stack,
  ScrollArea,
  Box,
  TextInput,
  Textarea,
  Popover,
} from "@mantine/core";
import {
  IconArrowRight,
  IconChevronDown,
  IconSettings,
  IconSearch,
  IconPlus,
  IconDots,
  IconFolder,
  IconFolderFilled,
  IconHome,
  IconCheckbox,
  IconChecklist,
  IconFileExport,
  IconArrowDown,
  IconList,
  IconLayoutDashboard,
  IconSettings2,
  IconTrash,
  IconArchive,
} from "@tabler/icons-react";
import {
  useProjects,
  useCreateProjectMutation,
  useProject,
} from "../hooks/use-projects";
import { Project } from "../types";
import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { useForm } from "@mantine/form";
import classes from "../../space/components/sidebar/space-sidebar.module.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import clsx from "clsx";
import { ProjectTree } from "./project-tree";
import { ProjectFileTree } from "./project-file-tree";
import TaskFormModal from "./task-form-modal";

interface ProjectFileSidebarProps {
  spaceId: string;
  projectId: string;
  onSelectView?: (view: string) => void;
  onSelectTask?: (taskId: string) => void;
}

export function ProjectFileSidebar({
  spaceId,
  projectId,
  onSelectView,
  onSelectTask,
}: ProjectFileSidebarProps) {
  const { t } = useTranslation();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const location = useLocation();
  const navigate = useNavigate();
  const [opened, { open, close }] = useDisclosure(false);
  const [activeView, setActiveView] = useState("board");

  const handleViewChange = (view: string) => {
    setActiveView(view);
    if (onSelectView) {
      onSelectView(view);
    }
  };

  const handleSwitchProject = (project: Project) => {
    navigate(`/spaces/${spaceId}/projects/${project.id}`);
  };

  const handleTaskSelect = (taskId: string) => {
    if (onSelectTask) {
      onSelectTask(taskId);
    }
  };

  if (isProjectLoading || !project) {
    return (
      <div className={classes.navbar}>
        <Text size="sm" c="dimmed" p="md">
          {t("Loading...")}
        </Text>
      </div>
    );
  }

  return (
    <>
      <div className={classes.navbar}>
        {/* Project Selector Section */}
        <div
          className={classes.section}
          style={{
            border: "none",
            marginTop: 2,
            marginBottom: 3,
          }}
        >
          <ProjectSelect
            project={project}
            spaceId={spaceId}
            onSelectProject={handleSwitchProject}
          />
        </div>

        {/* Navigation Section */}
        <div className={classes.section}>
          <div className={classes.menuItems}>
            <UnstyledButton
              className={clsx(
                classes.menu,
                activeView === "overview" ? classes.activeButton : ""
              )}
              onClick={() => handleViewChange("overview")}
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
              className={clsx(
                classes.menu,
                activeView === "board" ? classes.activeButton : ""
              )}
              onClick={() => handleViewChange("board")}
            >
              <div className={classes.menuItemInner}>
                <IconLayoutDashboard
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Board")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton
              className={clsx(
                classes.menu,
                activeView === "list" ? classes.activeButton : ""
              )}
              onClick={() => handleViewChange("list")}
            >
              <div className={classes.menuItemInner}>
                <IconList
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("List")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton
              className={clsx(
                classes.menu,
                activeView === "settings" ? classes.activeButton : ""
              )}
              onClick={() => handleViewChange("settings")}
            >
              <div className={classes.menuItemInner}>
                <IconSettings
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Project settings")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton className={classes.menu} onClick={open}>
              <div className={classes.menuItemInner}>
                <IconPlus
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("New task")}</span>
              </div>
            </UnstyledButton>
          </div>
        </div>

        {/* Tasks Section */}
        <div className={clsx(classes.section, classes.sectionPages)}>
          <Group className={classes.pagesHeader} justify="space-between">
            <Text size="xs" fw={500} c="dimmed">
              {t("Tasks")}
            </Text>

            <Group gap="xs">
              <Menu width={200} shadow="md" withArrow>
                <Menu.Target>
                  <Tooltip label={t("Task options")} withArrow position="top">
                    <ActionIcon
                      variant="default"
                      size={18}
                      aria-label={t("Task menu")}
                    >
                      <IconDots />
                    </ActionIcon>
                  </Tooltip>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconPlus size={16} />}
                    onClick={open}
                  >
                    {t("Add task")}
                  </Menu.Item>

                  <Menu.Item leftSection={<IconChecklist size={16} />}>
                    {t("Task backlog")}
                  </Menu.Item>

                  <Menu.Divider />

                  <Menu.Item leftSection={<IconArchive size={16} />}>
                    {t("Archived tasks")}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>

              <Tooltip label={t("Create task")} withArrow position="right">
                <ActionIcon
                  variant="default"
                  size={18}
                  onClick={open}
                  aria-label={t("Create task")}
                >
                  <IconPlus />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <div className={classes.pages}>
            <ProjectTree
              projectId={projectId}
              spaceId={spaceId}
              onTaskSelect={handleTaskSelect}
            />
          </div>
        </div>

        {/* Files Section */}
        <div className={classes.section}>
          <Group justify="space-between" className={classes.sectionHeader}>
            <Text size="xs" fw={600} c="dimmed">
              {t("FILES")}
            </Text>
          </Group>

          <div className={classes.menuItems}>
            <ScrollArea style={{ height: "calc(100vh - 350px)" }}>
              <ProjectFileTree
                projectId={projectId}
                spaceId={spaceId}
              />
            </ScrollArea>
          </div>
        </div>
      </div>

      <TaskFormModal
        opened={opened}
        onClose={close}
        projectId={projectId}
        spaceId={spaceId}
      />
    </>
  );
}

interface ProjectSelectProps {
  project: Project;
  spaceId: string;
  onSelectProject: (project: Project) => void;
}

function ProjectSelect({
  project,
  spaceId,
  onSelectProject,
}: ProjectSelectProps) {
  const { t } = useTranslation();
  const [opened, { close, open, toggle }] = useDisclosure(false);
  const { data: projectsData } = useProjects({ spaceId });

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

  const handleSelect = (selectedProject: Project) => {
    onSelectProject(selectedProject);
    close();
  };

  return (
    <Popover
      width={300}
      position="bottom"
      withArrow
      shadow="md"
      opened={opened}
      onChange={toggle}
    >
      <Popover.Target>
        <Button
          variant="subtle"
          fullWidth
          justify="space-between"
          rightSection={<IconChevronDown size={18} />}
          color="gray"
          onClick={open}
        >
          <IconFolder size={20} />
          <Text
            className={classes.spaceName}
            size="md"
            fw={500}
            lineClamp={1}
            ml="xs"
          >
            {project.name}
          </Text>
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {t("Switch project")}
          </Text>
          <ScrollArea h={200}>
            <Stack gap="xs">
              {projects.map((p) => (
                <UnstyledButton
                  key={p.id}
                  className={clsx(
                    classes.menu,
                    p.id === project.id ? classes.activeButton : ""
                  )}
                  onClick={() => handleSelect(p)}
                >
                  <div className={classes.menuItemInner}>
                    {p.id === project.id ? (
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
                      {p.name}
                    </Text>
                  </div>
                </UnstyledButton>
              ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
