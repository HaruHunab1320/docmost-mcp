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
import {
  getReviewDueDate,
  getWeekLabel,
  isReviewDue,
  isWeeklyReviewCompleted,
  readWeeklyChecks,
} from "@/features/gtd/utils/review-schedule";
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
  const reviewDate = useMemo(() => new Date(), []);
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    []
  );
  const reviewDue = useMemo(() => isReviewDue(reviewDate), [reviewDate]);
  const reviewCompleted = useMemo(() => {
    if (!spaceId) return false;
    return isWeeklyReviewCompleted(spaceId, reviewDate);
  }, [reviewDate, spaceId]);
  const reviewDueDate = useMemo(
    () => getReviewDueDate(reviewDate),
    [reviewDate]
  );
  const reviewWeekLabel = useMemo(
    () => getWeekLabel(reviewDate),
    [reviewDate]
  );
  const reviewChecks = useMemo(() => {
    if (!spaceId) return null;
    return readWeeklyChecks(spaceId, reviewDate);
  }, [reviewDate, spaceId]);
  const reviewProgress = useMemo(() => {
    if (!reviewChecks) return null;
    const values = Object.values(reviewChecks);
    return {
      total: values.length,
      done: values.filter(Boolean).length,
    };
  }, [reviewChecks]);

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
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Title order={2}>{t("Today")}</Title>
            <Text size="sm" c="dimmed">
              {todayLabel}
            </Text>
          </Stack>
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
          <Card withBorder radius="md" p="sm">
            <Group justify="space-between" mb="xs">
              <Title order={4}>{t("Suggested focus")}</Title>
              <Button
                size="xs"
                variant="subtle"
                component={Link}
                to={APP_ROUTE.SPACE.TRIAGE(spaceId)}
              >
                {t("Open triage")}
              </Button>
            </Group>
            {triageSummaryQuery.data.goalFocus?.length ? (
              <Stack gap="sm">
                {triageSummaryQuery.data.goalFocus.map((goal) => (
                  <Stack key={goal.goalId} gap={4}>
                    <Text size="sm" fw={600}>
                      {goal.name} ({goal.taskCount})
                    </Text>
                    <Stack gap={2}>
                      {goal.taskTitles.slice(0, 4).map((title, index) => (
                        <Text key={`${goal.goalId}-${index}`} size="xs" c="dimmed">
                          {title}
                        </Text>
                      ))}
                      {goal.taskTitles.length > 4 ? (
                        <Text size="xs" c="dimmed">
                          {t("More tasks")} (+{goal.taskTitles.length - 4})
                        </Text>
                      ) : null}
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                {t("No goal matches yet")}
              </Text>
            )}
          </Card>
        </Stack>
      ) : null}

      {reviewDue && !reviewCompleted ? (
        <Card withBorder radius="md" p="sm" mb="xl">
          <Group justify="space-between" mb="xs">
            <Title order={4}>{t("Weekly review due")}</Title>
            <Button
              component={Link}
              to={APP_ROUTE.SPACE.REVIEW(spaceId)}
              size="xs"
              variant="subtle"
            >
              {t("Open review")}
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            {t("Week of {{range}}", { range: reviewWeekLabel })}
          </Text>
          <Text size="xs" c="dimmed">
            {t("Due by {{date}}", {
              date: reviewDueDate.toLocaleDateString(),
            })}
          </Text>
          {reviewProgress ? (
            <Text size="sm">
              {t("Progress {{done}}/{{total}}", {
                done: reviewProgress.done,
                total: reviewProgress.total,
              })}
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              {t("Checklist not started")}
            </Text>
          )}
        </Card>
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
