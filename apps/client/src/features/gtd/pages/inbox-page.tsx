import { useMemo } from "react";
import { Button, Checkbox, Container, Group, Text, Title } from "@mantine/core";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTasksBySpace } from "@/features/project/hooks/use-tasks";
import { GtdTaskList } from "@/features/gtd/components/gtd-task-list";
import APP_ROUTE from "@/lib/app-route";
import { getTaskBucket } from "@/features/gtd/utils/task-buckets";
import { useState } from "react";

export function InboxPage() {
  const { t } = useTranslation();
  const { spaceId } = useParams<{ spaceId: string }>();
  const [showWaiting, setShowWaiting] = useState(false);
  const [showSomeday, setShowSomeday] = useState(false);

  const { data: tasksData, isLoading } = useTasksBySpace({
    spaceId: spaceId || "",
    page: 1,
    limit: 200,
  });

  const inboxTasks = useMemo(() => {
    return (tasksData?.items || []).filter(
      (task) =>
        !task.projectId &&
        !task.isCompleted &&
        (!getTaskBucket(spaceId || "", task.id) ||
          (showWaiting && getTaskBucket(spaceId || "", task.id) === "waiting") ||
          (showSomeday && getTaskBucket(spaceId || "", task.id) === "someday"))
    );
  }, [showSomeday, showWaiting, spaceId, tasksData?.items]);

  if (!spaceId) {
    return (
      <Container size="md" py="xl">
        <Text>{t("Missing space ID")}</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Group mb="md" justify="space-between" align="center">
        <Title order={2}>{t("Inbox")}</Title>
        <Group>
          <Checkbox
            label={t("Show Waiting")}
            checked={showWaiting}
            onChange={(event) => setShowWaiting(event.currentTarget.checked)}
          />
          <Checkbox
            label={t("Show Someday")}
            checked={showSomeday}
            onChange={(event) => setShowSomeday(event.currentTarget.checked)}
          />
        </Group>
        <Button
          component={Link}
          to={APP_ROUTE.SPACE.TRIAGE(spaceId)}
          variant="subtle"
        >
          {t("Start triage")}
        </Button>
      </Group>

      {isLoading ? (
        <Text size="sm" c="dimmed">
          {t("Loading inbox...")}
        </Text>
      ) : (
        <GtdTaskList
          tasks={inboxTasks}
          spaceId={spaceId}
          emptyMessage={t("Inbox is clear")}
        />
      )}
    </Container>
  );
}
