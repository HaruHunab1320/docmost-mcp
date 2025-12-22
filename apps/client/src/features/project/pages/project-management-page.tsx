import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Container,
  Group,
  Paper,
  Title,
  Text,
  Breadcrumbs,
  Anchor,
  Button,
  Flex,
} from "@mantine/core";
import { ProjectList } from "../components/project-list";
import { ProjectBoard } from "../components/project-board";
import { Project } from "../types";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrentSpace } from "@/features/space/hooks/use-current-space";
import { useCurrentWorkspace } from "@/features/workspace/hooks/use-current-workspace";
import { Dashboard } from "../components/dashboard/components/Dashboard";
import { DashboardMetrics } from "../components/dashboard/components/DashboardMetrics";
import { DashboardCharts } from "../components/dashboard/components/DashboardCharts";
import { useDashboardData } from "../components/dashboard/dashboard-hooks";
import { DashboardHeader } from "../components/dashboard/components/DashboardHeader";
import { useCreateProjectMutation } from "../hooks/use-projects";
import { useDisclosure } from "@mantine/hooks";
import ProjectFormModal from "../components/project-form-modal";
import { QuickTaskModal } from "../components/quick-task-modal";

export function ProjectManagementPage() {
  const { t } = useTranslation();
  const { spaceId } = useParams<{ spaceId: string }>();
  const { data: spaceData } = useCurrentSpace();
  const { data: workspaceData } = useCurrentWorkspace();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const location = useLocation();
  const [quickTaskOpened, setQuickTaskOpened] = useState(false);
  const [quickTaskProjectId, setQuickTaskProjectId] = useState<string | null>(
    null
  );

  // Use useDisclosure with a stable reference
  const [createModalOpened, createModalHandlers] = useDisclosure(false);

  // Create stable callback references to prevent re-renders
  const openCreateModal = useCallback(() => {
    console.log("Opening create project modal with spaceId:", spaceId);
    createModalHandlers.open();
  }, [spaceId, createModalHandlers]);

  const closeCreateModal = useCallback(() => {
    createModalHandlers.close();
  }, [createModalHandlers]);

  // Initialize the createProject mutation
  const createProjectMutation = useCreateProjectMutation();

  const {
    projects,
    taskStats,
    projectWithMostTasks,
    projectCompletionRates,
    taskDistributionByOwner,
    isLoading,
  } = useDashboardData({ spaceId });

  // Monitor URL for project ID
  useEffect(() => {
    const projectId = new URLSearchParams(location.search).get("projectId");
    if (projectId) {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        setShowDashboard(false);
      }
      return;
    }

    setSelectedProject(null);
    setShowDashboard(true);
  }, [location.search, projects]);

  // Debug logging
  console.log("ProjectManagementPage - spaceId:", spaceId);
  console.log("ProjectManagementPage - spaceData:", spaceData);
  console.log("ProjectManagementPage - workspaceData:", workspaceData);
  console.log("ProjectManagementPage - showDashboard:", showDashboard);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setShowDashboard(false);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
  };

  const handleToggleDashboard = () => {
    setShowDashboard(!showDashboard);
  };

  const openQuickTask = (projectId?: string | null) => {
    setQuickTaskProjectId(projectId || null);
    setQuickTaskOpened(true);
  };

  const renderBreadcrumbs = () => {
    const items = [
      { title: workspaceData.name, href: "/dashboard" },
      { title: spaceData.name, href: `/spaces/${spaceId}` },
      { title: t("Projects"), href: `/spaces/${spaceId}/projects` },
    ];

    if (selectedProject) {
      items.push({ title: selectedProject.name, href: "#" });
    } else if (!showDashboard) {
      items.push({ title: t("All Projects"), href: "#" });
    } else {
      items.push({ title: t("Dashboard"), href: "#" });
    }

    return (
      <Breadcrumbs mb="md">
        {items.map((item, index) => (
          <Anchor
            key={index}
            href={item.href}
            onClick={(e) => {
              e.preventDefault();
              if (index === items.length - 1 && item.title === t("Dashboard")) {
                // Don't do anything if we're already on the dashboard
              } else if (
                index === items.length - 1 &&
                item.title === t("All Projects")
              ) {
                setShowDashboard(true);
              } else if (
                index === items.length - 2 &&
                items[items.length - 1].title !== t("Dashboard")
              ) {
                setSelectedProject(null);
                setShowDashboard(false);
              }
            }}
          >
            {item.title}
          </Anchor>
        ))}
      </Breadcrumbs>
    );
  };

  const renderContent = () => {
    if (selectedProject) {
      return (
        <Box>
          <ProjectBoard
            project={selectedProject}
            onBack={handleBackToProjects}
          />
        </Box>
      );
    }

    if (showDashboard) {
      return (
        <Box p="md">
          <Group justify="space-between">
            <DashboardHeader
              onCreateProject={openCreateModal}
              onViewProjects={() => setShowDashboard(false)}
              onQuickAddTask={() => openQuickTask()}
            />
          </Group>
          <Box mt="xl">
            <DashboardMetrics
              taskStats={taskStats}
              projectCount={projects.length}
              spaceId={spaceId}
            />
          </Box>
          <Box mt="xl">
            <DashboardCharts
              projectCompletionRates={projectCompletionRates}
              projectWithMostTasks={projectWithMostTasks}
              taskStats={taskStats}
              taskDistributionByOwner={taskDistributionByOwner || []}
              onOpenProject={handleSelectProject}
              onAddTask={(project) => openQuickTask(project.id)}
            />
          </Box>
        </Box>
      );
    }

    return (
      <ProjectList
        spaceId={spaceId}
        workspaceId={workspaceData.id}
        onSelectProject={handleSelectProject}
        onShowDashboard={() => setShowDashboard(true)}
      />
    );
  };

  // Memoize the ProjectFormModal to prevent unnecessary re-renders
  const projectFormModalMemo = useMemo(
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

  // Return early if data is missing
  if (!spaceId || !spaceData || !workspaceData) {
    return (
      <Container my="xl">
        <Text>{t("Loading...")}</Text>
      </Container>
    );
  }

  return (
    <>
      <Container size="xl" my="xl">
        {/* Breadcrumbs provide navigation between workspace, space, project list, and current project */}
        {renderBreadcrumbs()}

        {renderContent()}

        {/* Use memoized modal */}
        {projectFormModalMemo}
        <QuickTaskModal
          opened={quickTaskOpened}
          onClose={() => setQuickTaskOpened(false)}
          spaceId={spaceId}
          projects={projects}
          defaultProjectId={quickTaskProjectId}
        />
      </Container>
    </>
  );
}
