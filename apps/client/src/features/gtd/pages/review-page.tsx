import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { usePagedSpaceTasks } from "@/features/gtd/hooks/use-paged-space-tasks";
import { useProjects } from "@/features/project/hooks/use-projects";
import { projectService } from "@/features/project/services/project-service";
import { notifications } from "@mantine/notifications";
import { TaskDrawer } from "@/features/project/components/task-drawer";
import { filterTasksByBucket } from "@/features/gtd/utils/task-buckets";
import { useSpaceQuery } from "@/features/space/queries/space-query";
import { getOrCreateWeeklyReviewPage } from "@/features/gtd/utils/weekly-review";
import { buildPageUrl } from "@/features/page/page.utils";
import { getAgentSuggestions } from "@/features/agent/services/agent-service";
import {
  getReviewDueDate,
  getWeekKey,
  getWeekLabel,
  getWeeklyReviewCompletionKey,
  getWeeklyReviewStorageKey,
  isReviewDue,
  readWeeklyChecks,
} from "@/features/gtd/utils/review-schedule";

import APP_ROUTE from "@/lib/app-route";

const STALE_DAYS = 14;
const CHECKLIST_ACTION_WIDTH = 220;
const REVIEW_ITEMS = [
  {
    label: "Clear Inbox",
    actionLabel: "Open Inbox",
    getHref: (spaceId: string) => APP_ROUTE.SPACE.INBOX(spaceId),
  },
  {
    label: "Update next actions for active projects",
    actionLabel: "Open Projects",
    getHref: (spaceId: string) => APP_ROUTE.SPACE.PROJECTS(spaceId),
  },
  {
    label: "Review waiting/on-hold items",
    actionLabel: "Open Waiting",
    getHref: (spaceId: string) => APP_ROUTE.SPACE.WAITING(spaceId),
  },
  {
    label: "Review someday/maybe list",
    actionLabel: "Open Someday",
    getHref: (spaceId: string) => APP_ROUTE.SPACE.SOMEDAY(spaceId),
  },
  {
    label: "Review calendar and upcoming deadlines",
    actionLabel: "Open Today",
    getHref: (spaceId: string) => APP_ROUTE.SPACE.TODAY(spaceId),
  },
];

export function ReviewPage() {
  const { t } = useTranslation();
  const { spaceId } = useParams<{ spaceId: string }>();
  const [weeklyChecks, setWeeklyChecks] = useState<Record<string, boolean>>({});
  const [nextActionDrafts, setNextActionDrafts] = useState<
    Record<string, string>
  >({});
  const [creatingProjectId, setCreatingProjectId] = useState<string | null>(
    null
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [creatingReviewPage, setCreatingReviewPage] = useState(false);
  const { data: space } = useSpaceQuery(spaceId || "");
  const reviewDate = useMemo(() => new Date(), []);
  const weekKey = useMemo(() => getWeekKey(reviewDate), [reviewDate]);
  const weekLabel = useMemo(() => getWeekLabel(reviewDate), [reviewDate]);
  const dueDate = useMemo(() => getReviewDueDate(reviewDate), [reviewDate]);
  const reviewDue = useMemo(() => isReviewDue(reviewDate), [reviewDate]);

  const {
    items: tasks,
    isLoading: tasksLoading,
    hasNextPage,
    loadMore,
  } = usePagedSpaceTasks(spaceId || "", { autoLoadAll: true, limit: 200 });
  const { data: projectsData, isLoading: projectsLoading } = useProjects({
    spaceId: spaceId || "",
  });
  const agentSuggestionsQuery = useQuery({
    queryKey: ["agent-suggestions", spaceId],
    queryFn: () => getAgentSuggestions({ spaceId: spaceId || "", limit: 8 }),
    enabled: !!spaceId,
  });

  const projects = Array.isArray(projectsData?.items)
    ? projectsData.items
    : Array.isArray(projectsData?.data)
      ? projectsData.data
      : [];

  const reviewKey = spaceId
    ? getWeeklyReviewStorageKey(spaceId, reviewDate)
    : "";
  const completionKey = spaceId
    ? getWeeklyReviewCompletionKey(spaceId, reviewDate)
    : "";

  useEffect(() => {
    if (!reviewKey || !spaceId) return;
    const stored = readWeeklyChecks(spaceId, reviewDate);
    if (stored) {
      setWeeklyChecks(stored);
      return;
    }
    const defaults = REVIEW_ITEMS.reduce<Record<string, boolean>>(
      (acc, item) => {
        acc[item.label] = false;
        return acc;
      },
      {}
    );
    setWeeklyChecks(defaults);
  }, [reviewDate, reviewKey, spaceId]);

  useEffect(() => {
    if (!reviewKey) return;
    localStorage.setItem(reviewKey, JSON.stringify(weeklyChecks));
    if (!completionKey) return;
    const allChecked =
      REVIEW_ITEMS.length > 0 &&
      REVIEW_ITEMS.every((item) => Boolean(weeklyChecks[item.label]));
    if (allChecked) {
      localStorage.setItem(completionKey, new Date().toISOString());
    } else {
      localStorage.removeItem(completionKey);
    }
  }, [completionKey, reviewKey, weeklyChecks]);

  const checkedCount = useMemo(() => {
    return REVIEW_ITEMS.reduce((count, item) => {
      return count + (weeklyChecks[item.label] ? 1 : 0);
    }, 0);
  }, [weeklyChecks]);
  const totalCount = REVIEW_ITEMS.length;
  const reviewCompleted = totalCount > 0 && checkedCount === totalCount;

  const summary = useMemo(() => {
    const inbox = tasks.filter((task) => !task.projectId && !task.isCompleted);
    const overdue = tasks.filter((task) => {
      if (!task.dueDate || task.isCompleted) return false;
      const due = new Date(task.dueDate);
      return !Number.isNaN(due.getTime()) && due < new Date();
    });

    const projectStats = projects.map((project) => {
      const projectTasks = tasks.filter(
        (task) => task.projectId === project.id
      );
      const activeTasks = projectTasks.filter((task) => !task.isCompleted);
      const latestUpdated = projectTasks.reduce<Date | null>((latest, task) => {
        const updated = new Date(task.updatedAt);
        if (Number.isNaN(updated.getTime())) return latest;
        if (!latest || updated > latest) return updated;
        return latest;
      }, null);

      return {
        project,
        activeTasks,
        totalTasks: projectTasks.length,
        latestUpdated,
      };
    });

    const staleTasks = tasks.filter((task) => {
      if (task.isCompleted) return false;
      const updated = new Date(task.updatedAt);
      if (Number.isNaN(updated.getTime())) return false;
      const diffMs = new Date().getTime() - updated.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays > STALE_DAYS;
    });

    const noNextAction = projectStats.filter(
      (stat) => stat.totalTasks === 0 || stat.activeTasks.length === 0
    );

    const suggestions = projectStats
      .map((stat) => {
        const candidate = stat.activeTasks.slice().sort((a, b) => {
          const aDate = new Date(a.updatedAt).getTime();
          const bDate = new Date(b.updatedAt).getTime();
          return bDate - aDate;
        })[0];
        return candidate
          ? {
              task: candidate,
              project: stat.project,
            }
          : null;
      })
      .filter(Boolean);

    const waiting = filterTasksByBucket(tasks, "waiting");
    const someday = filterTasksByBucket(tasks, "someday");

    return {
      inbox,
      overdue,
      staleTasks,
      noNextAction,
      suggestions,
      waiting,
      someday,
    };
  }, [projects, spaceId, tasks]);

  const handleCreateNextAction = async (projectId: string) => {
    const title = (nextActionDrafts[projectId] || "").trim();
    if (!title || !spaceId) return;
    setCreatingProjectId(projectId);
    try {
      await projectService.createTask({
        title,
        spaceId,
        projectId,
        priority: "medium",
      });
      notifications.show({
        title: t("Next action added"),
        message: t("Task created"),
        color: "green",
      });
      setNextActionDrafts((prev) => ({ ...prev, [projectId]: "" }));
    } catch (error) {
      notifications.show({
        title: t("Error"),
        message: t("Failed to create task"),
        color: "red",
      });
    } finally {
      setCreatingProjectId(null);
    }
  };

  if (!spaceId) {
    return (
      <Container size="md" py="xl">
        <Text>{t("Missing space ID")}</Text>
      </Container>
    );
  }

  if (tasksLoading || projectsLoading) {
    return (
      <Container size="md" py="xl">
        <Text size="sm" c="dimmed">
          {t("Loading review...")}
        </Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xs" mb="md">
        <Group justify="space-between">
          <Title order={2}>{t("Weekly Review")}</Title>
        </Group>
        <Text size="sm" c="dimmed">
          {t(
            "Use this page to reset your system: clear inboxes, confirm next actions, and review waiting/someday lists."
          )}
        </Text>
      </Stack>

      <Stack gap="lg">
        {hasNextPage && (
          <Button variant="light" onClick={loadMore}>
            {t("Load more tasks")}
          </Button>
        )}
        <Stack gap="xs">
          <Group justify="space-between">
            <Title order={4}>{t("Weekly checklist")}</Title>
            <Group gap="xs">
              <Button
                variant="light"
                size="xs"
                loading={creatingReviewPage}
                onClick={async () => {
                  if (!space) return;
                  setCreatingReviewPage(true);
                  try {
                    const reviewPage = await getOrCreateWeeklyReviewPage({
                      spaceId: space.id,
                    });
                    const url = buildPageUrl(
                      space.slug,
                      reviewPage.slugId,
                      reviewPage.title
                    );
                    window.location.href = url;
                  } finally {
                    setCreatingReviewPage(false);
                  }
                }}
              >
                {t("Create review note")}
              </Button>
            </Group>
          </Group>
          <Text size="sm" c="dimmed">
            {t("Week of {{range}}", { range: weekLabel })}
          </Text>
          <Group gap="sm">
            <Text size="xs" c="dimmed">
              {t("Due {{date}}", { date: dueDate.toLocaleDateString() })}
            </Text>
            <Text size="xs" c="dimmed">
              {t("Progress {{done}}/{{total}}", {
                done: checkedCount,
                total: totalCount,
              })}
            </Text>
            {reviewCompleted ? (
              <Text size="xs" c="green">
                {t("Completed")}
              </Text>
            ) : reviewDue ? (
              <Text size="xs" c="orange">
                {t("Due now")}
              </Text>
            ) : null}
          </Group>
          <Stack gap="xs">
            {REVIEW_ITEMS.map((item) => (
              <Group key={item.label} justify="space-between">
                <Checkbox
                  checked={!!weeklyChecks[item.label]}
                  label={t(item.label)}
                  onChange={() =>
                    setWeeklyChecks((prev) => ({
                      ...prev,
                      [item.label]: !prev[item.label],
                    }))
                  }
                />
                <Button
                  component={Link}
                  to={item.getHref(spaceId)}
                  variant="subtle"
                  size="xs"
                  style={{ width: CHECKLIST_ACTION_WIDTH }}
                  styles={{
                    label: {
                      whiteSpace: "nowrap",
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                    },
                  }}
                >
                  {t(item.actionLabel)}
                </Button>
              </Group>
            ))}
          </Stack>
        </Stack>

        <Stack gap="xs">
          <Group justify="space-between">
            <Title order={4}>{t("Inbox backlog")}</Title>
          </Group>
          <Text size="sm" c="dimmed">
            {t("Items waiting for triage: {{count}}", {
              count: summary.inbox.length,
            })}
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={4}>{t("Overdue")}</Title>
          {summary.overdue.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("No overdue tasks")}
            </Text>
          ) : (
            summary.overdue.slice(0, 10).map((task) => (
              <Button
                key={task.id}
                variant="subtle"
                size="xs"
                justify="space-between"
                onClick={() => {
                  setSelectedTaskId(task.id);
                  setDrawerOpened(true);
                }}
              >
                <Group justify="space-between" w="100%" wrap="nowrap">
                  <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                    {task.title}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : t("No due date")}
                  </Text>
                </Group>
              </Button>
            ))
          )}
        </Stack>

        <Stack gap="xs">
          <Group justify="space-between">
            <Title order={4}>{t("Stale tasks")}</Title>
            <Button
              component={Link}
              to={APP_ROUTE.SPACE.TASKS(spaceId)}
              variant="subtle"
              size="xs"
            >
              {t("Open tasks")}
            </Button>
          </Group>
          {summary.staleTasks.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("No stale tasks")}
            </Text>
          ) : (
            summary.staleTasks.slice(0, 10).map((task) => (
              <Button
                key={task.id}
                variant="subtle"
                size="xs"
                justify="space-between"
                onClick={() => {
                  setSelectedTaskId(task.id);
                  setDrawerOpened(true);
                }}
              >
                <Group justify="space-between" w="100%" wrap="nowrap">
                  <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                    {task.title}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                    {new Date(task.updatedAt).toLocaleDateString()}
                  </Text>
                </Group>
              </Button>
            ))
          )}
          <Text size="xs" c="dimmed">
            {t("No activity in {{days}}+ days", { days: STALE_DAYS })}
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={4}>{t("No next action")}</Title>
          {summary.noNextAction.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("All projects have next actions")}
            </Text>
          ) : (
            summary.noNextAction.map((stat) => (
              <Stack key={stat.project.id} gap="xs">
                <Group justify="space-between">
                  <Text size="sm">{stat.project.name}</Text>
                  <Button
                    component={Link}
                    to={`/spaces/${spaceId}/projects?projectId=${stat.project.id}`}
                    variant="subtle"
                    size="xs"
                  >
                    {t("Open")}
                  </Button>
                </Group>
                <Group>
                  <TextInput
                    placeholder={t("Add next action")}
                    value={nextActionDrafts[stat.project.id] || ""}
                    onChange={(event) =>
                      setNextActionDrafts((prev) => ({
                        ...prev,
                        [stat.project.id]: event.currentTarget.value,
                      }))
                    }
                  />
                  <Button
                    onClick={() => handleCreateNextAction(stat.project.id)}
                    loading={creatingProjectId === stat.project.id}
                  >
                    {t("Add")}
                  </Button>
                </Group>
              </Stack>
            ))
          )}
        </Stack>

        <Stack gap="xs">
          <Title order={4}>{t("Suggested next actions")}</Title>
          {agentSuggestionsQuery.data?.items?.length ? (
            agentSuggestionsQuery.data.items.slice(0, 10).map((suggestion) => {
              const task = tasks.find((entry) => entry.id === suggestion.taskId);
              const title = suggestion.title || task?.title || t("Task");
              const projectName =
                suggestion.projectName ||
                (task as any)?.project_name ||
                "";
              return (
                <Button
                  key={suggestion.taskId}
                  variant="subtle"
                  size="xs"
                  justify="space-between"
                  onClick={() => {
                    setSelectedTaskId(suggestion.taskId);
                    setDrawerOpened(true);
                  }}
                >
                  <Group justify="space-between" w="100%" wrap="nowrap">
                    <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                      {projectName ? `${title} — ${projectName}` : title}
                    </Text>
                  </Group>
                </Button>
              );
            })
          ) : summary.suggestions.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("No suggestions yet")}
            </Text>
          ) : (
            summary.suggestions.slice(0, 10).map((suggestion) => (
              <Button
                key={suggestion.task.id}
                variant="subtle"
                size="xs"
                justify="space-between"
                onClick={() => {
                  setSelectedTaskId(suggestion.task.id);
                  setDrawerOpened(true);
                }}
              >
                <Group justify="space-between" w="100%" wrap="nowrap">
                  <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                    {suggestion.task.title} — {suggestion.project.name}
                  </Text>
                </Group>
              </Button>
            ))
          )}
        </Stack>

        <Stack gap="xs">
          <Group justify="space-between">
            <Title order={4}>{t("Waiting")}</Title>
            <Button
              component={Link}
              to={APP_ROUTE.SPACE.WAITING(spaceId)}
              variant="subtle"
              size="xs"
            >
              {t("Open")}
            </Button>
          </Group>
          {summary.waiting.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("No waiting items")}
            </Text>
          ) : (
            summary.waiting.slice(0, 10).map((task) => (
              <Text key={task.id} size="sm">
                {task.title}
              </Text>
            ))
          )}
        </Stack>

        <Stack gap="xs">
          <Group justify="space-between">
            <Title order={4}>{t("Someday")}</Title>
            <Button
              component={Link}
              to={APP_ROUTE.SPACE.SOMEDAY(spaceId)}
              variant="subtle"
              size="xs"
            >
              {t("Open")}
            </Button>
          </Group>
          {summary.someday.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("No someday items")}
            </Text>
          ) : (
            summary.someday.slice(0, 10).map((task) => (
              <Text key={task.id} size="sm">
                {task.title}
              </Text>
            ))
          )}
        </Stack>
      </Stack>

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          opened={drawerOpened}
          onClose={() => setDrawerOpened(false)}
          spaceId={spaceId || ""}
        />
      )}
    </Container>
  );
}
