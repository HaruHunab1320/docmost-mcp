import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTasksBySpace } from "@/features/project/hooks/use-tasks";
import { useProjects } from "@/features/project/hooks/use-projects";
import { projectService } from "@/features/project/services/project-service";
import { notifications } from "@mantine/notifications";
import { TaskDrawer } from "@/features/project/components/task-drawer";
import { filterTasksByBucket } from "@/features/gtd/utils/task-buckets";
import { useSpaceQuery } from "@/features/space/queries/space-query";
import { getOrCreateWeeklyReviewPage } from "@/features/gtd/utils/weekly-review";
import { buildPageUrl } from "@/features/page/page.utils";
import { ShortcutHint } from "@/features/gtd/components/shortcut-hint";

const STALE_DAYS = 14;
const REVIEW_ITEMS = [
  "Clear Inbox",
  "Update next actions for active projects",
  "Review waiting/on-hold items",
  "Review someday/maybe list",
  "Review calendar and upcoming deadlines",
];

function getWeekKey(date = new Date()) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const dayOffset = firstDay.getDay() || 7;
  const weekStart = new Date(firstDay);
  weekStart.setDate(firstDay.getDate() + (7 - dayOffset));
  const diff =
    date.getTime() -
    new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
      .getTime();
  const weekNumber = Math.ceil((diff / (1000 * 60 * 60 * 24) + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function getWeekLabel(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  start.setDate(start.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
}

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

  const { data: tasksData, isLoading: tasksLoading } = useTasksBySpace({
    spaceId: spaceId || "",
    page: 1,
    limit: 500,
  });
  const { data: projectsData, isLoading: projectsLoading } = useProjects({
    spaceId: spaceId || "",
  });

  const tasks = tasksData?.items || [];
  const projects = Array.isArray(projectsData?.items)
    ? projectsData.items
    : Array.isArray(projectsData?.data)
      ? projectsData.data
      : [];

  const reviewKey = spaceId ? `docmost.review.${spaceId}.${getWeekKey()}` : "";

  useEffect(() => {
    if (!reviewKey) return;
    const stored = localStorage.getItem(reviewKey);
    if (stored) {
      setWeeklyChecks(JSON.parse(stored));
      return;
    }
    const defaults = REVIEW_ITEMS.reduce<Record<string, boolean>>(
      (acc, item) => {
        acc[item] = false;
        return acc;
      },
      {}
    );
    setWeeklyChecks(defaults);
  }, [reviewKey]);

  useEffect(() => {
    if (!reviewKey) return;
    localStorage.setItem(reviewKey, JSON.stringify(weeklyChecks));
  }, [reviewKey, weeklyChecks]);

  const summary = useMemo(() => {
    const inbox = tasks.filter((task) => !task.projectId && !task.isCompleted);
    const overdue = tasks.filter((task) => {
      if (!task.dueDate || task.isCompleted) return false;
      const due = new Date(task.dueDate);
      return !Number.isNaN(due.getTime()) && due < new Date();
    });

    const projectStats = projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
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

    const staleProjects = projectStats.filter((stat) => {
      if (!stat.latestUpdated) return stat.totalTasks === 0;
      const diffMs = new Date().getTime() - stat.latestUpdated.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays > STALE_DAYS;
    });

    const noNextAction = projectStats.filter(
      (stat) => stat.totalTasks === 0 || stat.activeTasks.length === 0
    );

    const suggestions = projectStats
      .map((stat) => {
        const candidate = stat.activeTasks
          .slice()
          .sort((a, b) => {
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

    const waiting = filterTasksByBucket(spaceId || "", tasks, "waiting");
    const someday = filterTasksByBucket(spaceId || "", tasks, "someday");

    return {
      inbox,
      overdue,
      staleProjects,
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
          <Title order={2}>{t("Review")}</Title>
          <Button
            variant="light"
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
            {t("Open weekly review page")}
          </Button>
        </Group>
        <ShortcutHint />
      </Stack>

      <Stack gap="lg">
        <Stack gap="xs">
          <Group justify="space-between">
            <Title order={4}>{t("Weekly Review")}</Title>
            <Button
              variant="subtle"
              onClick={() => {
                const defaults = REVIEW_ITEMS.reduce<Record<string, boolean>>(
                  (acc, item) => {
                    acc[item] = false;
                    return acc;
                  },
                  {}
                );
                setWeeklyChecks(defaults);
              }}
            >
              {t("Reset")}
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            {t("Week of {{range}}", { range: getWeekLabel() })}
          </Text>
          <Stack gap="xs">
            {REVIEW_ITEMS.map((item) => (
              <Button
                key={item}
                variant={weeklyChecks[item] ? "filled" : "light"}
                onClick={() =>
                  setWeeklyChecks((prev) => ({
                    ...prev,
                    [item]: !prev[item],
                  }))
                }
              >
                {weeklyChecks[item] ? "✓ " : ""} {t(item)}
              </Button>
            ))}
          </Stack>
        </Stack>

        <Stack gap="xs">
          <Title order={4}>{t("Inbox backlog")}</Title>
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
              <Text key={task.id} size="sm">
                {task.title}
              </Text>
            ))
          )}
        </Stack>

        <Stack gap="xs">
          <Title order={4}>{t("Stale projects")}</Title>
          {summary.staleProjects.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("All projects active")}
            </Text>
          ) : (
            summary.staleProjects.map((stat) => (
              <Group key={stat.project.id} justify="space-between">
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
            ))
          )}
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
          {summary.suggestions.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("No suggestions yet")}
            </Text>
          ) : (
            summary.suggestions.slice(0, 10).map((suggestion) => (
              <Group key={suggestion.task.id} justify="space-between">
                <Stack gap={2}>
                  <Text size="sm">{suggestion.task.title}</Text>
                  <Text size="xs" c="dimmed">
                    {suggestion.project.name}
                  </Text>
                </Stack>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setSelectedTaskId(suggestion.task.id);
                    setDrawerOpened(true);
                  }}
                >
                  {t("Open")}
                </Button>
              </Group>
            ))
          )}
        </Stack>

        <Stack gap="xs">
          <Title order={4}>{t("Waiting")}</Title>
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
          <Title order={4}>{t("Someday")}</Title>
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
