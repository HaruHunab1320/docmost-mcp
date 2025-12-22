import { Group, Title, Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface DashboardHeaderProps {
  onCreateProject: () => void;
  onViewProjects?: () => void;
  onQuickAddTask?: () => void;
}

export function DashboardHeader({
  onCreateProject,
  onViewProjects,
  onQuickAddTask,
}: DashboardHeaderProps) {
  const { t } = useTranslation();

  return (
    <Group justify="space-between">
      <Title order={2}>{t("Project Dashboard")}</Title>
      <Group gap="xs">
        {onViewProjects && (
          <Button variant="light" onClick={onViewProjects} size="sm">
            {t("View projects")}
          </Button>
        )}
        {onQuickAddTask && (
          <Button variant="light" onClick={onQuickAddTask} size="sm">
            {t("Add task")}
          </Button>
        )}
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            console.log("Create Project button clicked");
            onCreateProject();
          }}
          size="sm"
        >
          {t("Create Project")}
        </Button>
      </Group>
    </Group>
  );
}
