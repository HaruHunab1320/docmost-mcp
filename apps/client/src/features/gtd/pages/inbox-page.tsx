import { useMemo } from "react";
import {
  Button,
  Checkbox,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePagedSpaceTasks } from "@/features/gtd/hooks/use-paged-space-tasks";
import { GtdTaskList } from "@/features/gtd/components/gtd-task-list";
import APP_ROUTE from "@/lib/app-route";
import { getTaskBucket } from "@/features/gtd/utils/task-buckets";
import { useState } from "react";
import { ShortcutHint } from "@/features/gtd/components/shortcut-hint";

export function InboxPage() {
  const { t } = useTranslation();
  const { spaceId } = useParams<{ spaceId: string }>();
  const [showWaiting, setShowWaiting] = useState(false);
  const [showSomeday, setShowSomeday] = useState(false);

  const { items: tasks, isLoading, hasNextPage, loadMore } =
    usePagedSpaceTasks(spaceId || "");

  const inboxTasks = useMemo(() => {
    return tasks.filter(
      (task) => {
        if (task.projectId || task.isCompleted) return false;
        const bucket = getTaskBucket(task);
        return (
          bucket === "none" ||
          bucket === "inbox" ||
          (showWaiting && bucket === "waiting") ||
          (showSomeday && bucket === "someday")
        );
      }
    );
  }, [showSomeday, showWaiting, tasks]);

  if (!spaceId) {
    return (
      <Container size="md" py="xl">
        <Text>{t("Missing space ID")}</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xs" mb="md">
        <Group justify="space-between" align="center">
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
        <ShortcutHint />
      </Stack>

      {isLoading ? (
        <Text size="sm" c="dimmed">
          {t("Loading inbox...")}
        </Text>
      ) : (
        <Stack gap="md">
          <GtdTaskList
            tasks={inboxTasks}
            spaceId={spaceId}
            emptyMessage={t("Inbox is clear")}
          />
          {hasNextPage && (
            <Button variant="light" onClick={loadMore}>
              {t("Load more")}
            </Button>
          )}
        </Stack>
      )}
    </Container>
  );
}
