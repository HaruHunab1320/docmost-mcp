import { useState } from "react";
import {
  Box,
  Container,
  Group,
  Title,
  Text,
  Breadcrumbs,
  Anchor,
  Button,
  Card,
} from "@mantine/core";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BreadcrumbBar } from "@/features/page/components/breadcrumbs/breadcrumb-bar";
import breadcrumbClasses from "@/features/page/components/breadcrumbs/breadcrumb.module.css";
import { useCurrentSpace } from "@/features/space/hooks/use-current-space";
import { useCurrentWorkspace } from "@/features/workspace/hooks/use-current-workspace";
import { useProjects } from "../hooks/use-projects";
import { ProjectView } from "../components/project-view";
import APP_ROUTE from "@/lib/app-route";

export function TasksPage() {
  const { t } = useTranslation();
  const { spaceId, projectId } = useParams<{
    spaceId: string;
    projectId?: string;
  }>();
  const { data: spaceData } = useCurrentSpace();
  const { data: workspaceData } = useCurrentWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  // Parse URL query parameters
  const queryParams = new URLSearchParams(location.search);
  const filterType = queryParams.get("filter");
  const filterValue = queryParams.get("value");

  // Get project data if a projectId is provided
  const { data: projectsData } = useProjects({
    spaceId: spaceId || "",
  });

  const projectData =
    projectId && projectsData?.items?.find((p) => p.id === projectId);

  // Generate page title based on filters
  const getPageTitle = () => {
    if (filterType === "all") {
      return t("All Tasks");
    } else if (filterType === "status") {
      if (filterValue === "done") return t("Completed Tasks");
      if (filterValue === "in_progress") return t("In-Progress Tasks");
      if (filterValue === "blocked") return t("Blocked Tasks");
      if (filterValue === "todo") return t("To-Do Tasks");
      if (filterValue === "in_review") return t("In-Review Tasks");
    } else if (filterType === "priority") {
      if (filterValue === "high") return t("High Priority Tasks");
      if (filterValue === "urgent") return t("Urgent Tasks");
      if (filterValue === "medium") return t("Medium Priority Tasks");
      if (filterValue === "low") return t("Low Priority Tasks");
    } else if (filterType === "dueDate") {
      if (filterValue === "overdue") return t("Overdue Tasks");
      if (filterValue === "upcoming") return t("Upcoming Tasks");
    }

    return projectId
      ? projectData?.name || t("Project Tasks")
      : t("Space Tasks");
  };

  const renderBreadcrumbs = () => {
    const items = [
      { title: workspaceData?.name || "Workspace", href: "/dashboard" },
      { title: spaceData?.name || "Space", href: APP_ROUTE.SPACE.TODAY(spaceId) },
      { title: t("Projects"), href: `/spaces/${spaceId}/projects` },
    ];

    if (projectId && projectData) {
      items.push({
        title: projectData.name,
        href: `/spaces/${spaceId}/projects?projectId=${projectId}`,
      });
    }

    return (
      <BreadcrumbBar>
        <Breadcrumbs className={breadcrumbClasses.breadcrumbs}>
          {items.map((item, index) => (
            <Anchor
              key={index}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                if (item.href !== "#") {
                  navigate(item.href);
                }
              }}
            >
              {item.title}
            </Anchor>
          ))}
        </Breadcrumbs>
      </BreadcrumbBar>
    );
  };

  const handleBackToDashboard = () => {
    navigate(`/spaces/${spaceId}/projects`);
  };

  if (!spaceId) {
    return (
      <Container my="xl">
        <Text>{t("Missing space ID")}</Text>
      </Container>
    );
  }

  return (
    <Container size="xl" my="xl">
      {renderBreadcrumbs()}

      <Box>
        <Group justify="space-between" mb="md">
          <Title order={3}>{getPageTitle()}</Title>
          <Button onClick={handleBackToDashboard}>
            {t("Back to Dashboard")}
          </Button>
        </Group>

        {!projectId ? (
          <Card p="xl" withBorder>
            <Text ta="center" py="xl">
              {t("Please select a project to view tasks")}
            </Text>
          </Card>
        ) : (
          <ProjectView projectId={projectId} spaceId={spaceId} />
        )}
      </Box>
    </Container>
  );
}
