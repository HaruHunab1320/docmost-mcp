import { useMemo } from "react";
import { Button, Container, Group, Text, Title } from "@mantine/core";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTasksBySpace } from "@/features/project/hooks/use-tasks";
import { GtdTaskList } from "@/features/gtd/components/gtd-task-list";
import { DailyNoteButton } from "@/features/gtd/components/daily-note-button";
import { Link } from "react-router-dom";
import APP_ROUTE from "@/lib/app-route";
import { JournalCapture } from "@/features/gtd/components/journal-capture";

function isToday(date: Date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function TodayPage() {
  const { t } = useTranslation();
  const { spaceId } = useParams<{ spaceId: string }>();

  const { data: tasksData, isLoading } = useTasksBySpace({
    spaceId: spaceId || "",
    page: 1,
    limit: 200,
  });

  const todayTasks = useMemo(() => {
    return (tasksData?.items || []).filter((task) => {
      if (!task.dueDate || task.isCompleted) return false;
      const parsed = new Date(task.dueDate);
      return !Number.isNaN(parsed.getTime()) && isToday(parsed);
    });
  }, [tasksData?.items]);

  if (!spaceId) {
    return (
      <Container size="md" py="xl">
        <Text>{t("Missing space ID")}</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Group mb="md" justify="space-between">
        <Title order={2}>{t("Today")}</Title>
        <Group>
          <Button
            component={Link}
            to={APP_ROUTE.SPACE.TRIAGE(spaceId)}
            variant="subtle"
          >
            {t("Open triage")}
          </Button>
          <Button
            component={Link}
            to={APP_ROUTE.SPACE.REVIEW(spaceId)}
            variant="subtle"
          >
            {t("Review")}
          </Button>
          <DailyNoteButton spaceId={spaceId} />
        </Group>
      </Group>

      {isLoading ? (
        <Text size="sm" c="dimmed">
          {t("Loading tasks...")}
        </Text>
      ) : (
        <GtdTaskList
          tasks={todayTasks}
          spaceId={spaceId}
          emptyMessage={t("No tasks scheduled for today")}
        />
      )}

      <Group mt="xl" mb="sm" justify="space-between">
        <Title order={3}>{t("Journal")}</Title>
        <Text size="xs" c="dimmed">
          {t("Capture thoughts into Inbox")}
        </Text>
      </Group>
      <JournalCapture spaceId={spaceId} />
    </Container>
  );
}
