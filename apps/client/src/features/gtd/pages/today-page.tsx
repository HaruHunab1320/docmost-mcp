import { useMemo } from "react";
import {
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePagedSpaceTasks } from "@/features/gtd/hooks/use-paged-space-tasks";
import { useQuery } from "@tanstack/react-query";
import { GtdTaskList } from "@/features/gtd/components/gtd-task-list";
import { DailyNoteButton } from "@/features/gtd/components/daily-note-button";
import { Link } from "react-router-dom";
import APP_ROUTE from "@/lib/app-route";
import { JournalCapture } from "@/features/gtd/components/journal-capture";
import { ShortcutHint } from "@/features/gtd/components/shortcut-hint";
import { projectService } from "@/features/project/services/project-service";
import { useAtom } from "jotai";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom";
import { AgentMemoryDrawer } from "@/features/agent-memory/components/agent-memory-drawer";
import { AgentMemoryCaptureModal } from "@/features/agent-memory/components/agent-memory-capture-modal";
import { AgentMemoryInsights } from "@/features/agent-memory/components/agent-memory-insights";
import { AgentDailySummary } from "@/features/agent/components/agent-daily-summary";
import { AgentApprovalsPanel } from "@/features/agent/components/agent-approvals-panel";
import { AgentProactiveQuestions } from "@/features/agent/components/agent-proactive-questions";
import { GoalPanel } from "@/features/goal/components/goal-panel";
import classes from "./today-page.module.css";

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
  const [workspace] = useAtom(workspaceAtom);
  const [memoryOpened, memoryHandlers] = useDisclosure(false);

  const { items: tasks, isLoading, hasNextPage, loadMore } =
    usePagedSpaceTasks(spaceId || "");

  const triageSummaryQuery = useQuery({
    queryKey: ["task-triage-summary", spaceId],
    queryFn: () => projectService.getTriageSummary(spaceId || "", 5),
    enabled: !!spaceId,
  });

  const todayTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.dueDate || task.isCompleted) return false;
      const parsed = new Date(task.dueDate);
      return !Number.isNaN(parsed.getTime()) && isToday(parsed);
    });
  }, [tasks]);

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
        <Group justify="space-between">
          <Title order={2}>{t("Today")}</Title>
          <Group>
            <Button variant="subtle" onClick={memoryHandlers.open}>
              {t("Memories")}
            </Button>
            {workspace?.id ? (
              <AgentMemoryCaptureModal
                workspaceId={workspace.id}
                spaceId={spaceId}
              />
            ) : null}
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
        <ShortcutHint />
      </Stack>

      {triageSummaryQuery.isLoading ? (
        <Text size="sm" c="dimmed" mb="md">
          {t("Loading daily summary...")}
        </Text>
      ) : triageSummaryQuery.isError ? (
        <Group mb="md">
          <Text size="sm" c="dimmed">
            {t("Daily summary unavailable")}
          </Text>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => triageSummaryQuery.refetch()}
          >
            {t("Retry")}
          </Button>
        </Group>
      ) : triageSummaryQuery.data ? (
        <Stack gap="md" mb="xl">
          <Group justify="space-between">
            <Title order={3}>{t("Daily Pulse")}</Title>
          </Group>

          <Group gap="md" grow align="stretch">
            <Card
              withBorder
              radius="md"
              p="sm"
              component={Link}
              to={APP_ROUTE.SPACE.INBOX(spaceId || "")}
              className={classes.pulseCard}
              data-hoverable="true"
            >
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  {t("Inbox")}
                </Text>
                <Text fw={600}>{triageSummaryQuery.data.counts.inbox}</Text>
              </Stack>
            </Card>
            <Card
              withBorder
              radius="md"
              p="sm"
              component={Link}
              to={APP_ROUTE.SPACE.WAITING(spaceId || "")}
              className={classes.pulseCard}
              data-hoverable="true"
            >
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  {t("Waiting")}
                </Text>
                <Text fw={600}>{triageSummaryQuery.data.counts.waiting}</Text>
              </Stack>
            </Card>
            <Card
              withBorder
              radius="md"
              p="sm"
              component={Link}
              to={APP_ROUTE.SPACE.SOMEDAY(spaceId || "")}
              className={classes.pulseCard}
              data-hoverable="true"
            >
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  {t("Someday")}
                </Text>
                <Text fw={600}>{triageSummaryQuery.data.counts.someday}</Text>
              </Stack>
            </Card>
          </Group>

          <Group align="flex-start" grow>
            <Stack gap="xs">
              <Title order={4}>{t("Overdue")}</Title>
              {triageSummaryQuery.data.overdue.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t("No overdue tasks")}
                </Text>
              ) : (
                triageSummaryQuery.data.overdue.map((task) => (
                  <Text key={task.id} size="sm">
                    {task.title}
                  </Text>
                ))
              )}
            </Stack>
            <Stack gap="xs">
              <Title order={4}>{t("Due today")}</Title>
              {triageSummaryQuery.data.dueToday.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t("Nothing due today")}
                </Text>
              ) : (
                triageSummaryQuery.data.dueToday.map((task) => (
                  <Text key={task.id} size="sm">
                    {task.title}
                  </Text>
                ))
              )}
            </Stack>
          </Group>
        </Stack>
      ) : null}

      {workspace?.id && workspace.settings?.agent?.enabled !== false ? (
        <Stack gap="md" mb="xl">
          <GoalPanel workspaceId={workspace.id} spaceId={spaceId} />
          {workspace.settings?.agent?.enableDailySummary !== false ? (
            <AgentDailySummary workspaceId={workspace.id} spaceId={spaceId} />
          ) : null}
          {workspace.settings?.agent?.enableProactiveQuestions !== false ? (
            <AgentProactiveQuestions
              workspaceId={workspace.id}
              spaceId={spaceId}
            />
          ) : null}
          <AgentMemoryInsights workspaceId={workspace.id} spaceId={spaceId} />
          <AgentApprovalsPanel />
        </Stack>
      ) : null}

      {isLoading ? (
        <Text size="sm" c="dimmed">
          {t("Loading tasks...")}
        </Text>
      ) : (
        <Stack gap="md">
          <GtdTaskList
            tasks={todayTasks}
            spaceId={spaceId}
            emptyMessage={t("No tasks scheduled for today")}
          />
          {hasNextPage && (
            <Button variant="light" onClick={loadMore}>
              {t("Load more")}
            </Button>
          )}
        </Stack>
      )}

      <Group mt="xl" mb="sm" justify="space-between">
        <Title order={3}>{t("Journal")}</Title>
        <Text size="xs" c="dimmed">
          {t("Capture thoughts into Inbox")}
        </Text>
      </Group>
      <JournalCapture spaceId={spaceId} />
      {workspace?.id ? (
        <AgentMemoryDrawer
          opened={memoryOpened}
          onClose={memoryHandlers.close}
          workspaceId={workspace.id}
          spaceId={spaceId}
        />
      ) : null}
    </Container>
  );
}
