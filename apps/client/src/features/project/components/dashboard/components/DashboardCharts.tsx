import {
  Grid,
  Card,
  Text,
  Stack,
  Group,
  Progress,
  SimpleGrid,
  RingProgress,
  Title,
  Badge,
  useMantineTheme,
  Avatar,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Project } from "../../../types";

interface ProjectCompletion {
  project: Project;
  totalCount: number;
  completedCount: number;
  completionRate: number;
}

interface MostActiveProject {
  project: Project | null;
  taskCount: number;
}

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  highPriorityTasks: number;
  dueSoonTasks: number;
  overdueTasks: number;
  tasksWithDueDate: number;
  completionRate: number;
}

interface TaskOwnerDistribution {
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

interface DashboardChartsProps {
  projectCompletionRates: ProjectCompletion[];
  projectWithMostTasks: MostActiveProject | null;
  taskStats: TaskStats;
  taskDistributionByOwner: TaskOwnerDistribution[];
  onOpenProject?: (project: Project) => void;
  onAddTask?: (project: Project) => void;
}

export function DashboardCharts({
  projectCompletionRates,
  projectWithMostTasks,
  taskStats,
  taskDistributionByOwner,
  onOpenProject,
  onAddTask,
}: DashboardChartsProps) {
  const { t } = useTranslation();
  const theme = useMantineTheme();

  return (
    <>
      <Title order={3} mt="lg">
        {t("Project Overview")}
      </Title>

      {/* Project completion rates */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder p="md" radius="md">
            <Text fw={500} size="lg" mb="md">
              {t("Project Completion Status")}
            </Text>
            {projectCompletionRates.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t("No projects to display")}
              </Text>
            ) : (
              <Stack gap="xs">
                {projectCompletionRates.slice(0, 5).map(
                  ({ project, totalCount, completedCount, completionRate }) => (
                    <div key={project.id}>
                      <Group justify="space-between" mb={5} align="center">
                        <Group>
                          <Text
                            size="sm"
                            fw={500}
                            style={{ cursor: onOpenProject ? "pointer" : "default" }}
                            onClick={() => onOpenProject?.(project)}
                          >
                            {project.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            ({completedCount}/{totalCount} {t("tasks")})
                          </Text>
                        </Group>
                        <Group gap="xs">
                          {onAddTask && (
                            <Badge
                              variant="light"
                              style={{ cursor: "pointer" }}
                              onClick={() => onAddTask(project)}
                            >
                              {t("Add task")}
                            </Badge>
                          )}
                          <Text size="xs" fw={700}>
                            {completionRate.toFixed(0)}%
                          </Text>
                        </Group>
                      </Group>
                        <Progress
                          value={completionRate}
                          size="sm"
                          color={
                            completionRate > 75
                              ? "green"
                              : completionRate > 50
                                ? "cyan"
                                : completionRate > 25
                                  ? "yellow"
                                  : "red"
                          }
                        />
                    </div>
                  )
                )}
              </Stack>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder p="md" radius="md" h="100%">
            <Text fw={500} size="lg" mb="md">
              {t("Most Active Project")}
            </Text>
            {projectWithMostTasks && projectWithMostTasks.project ? (
              <Stack justify="center" h="80%">
                <Title
                  order={3}
                  ta="center"
                  style={{ wordBreak: "break-word" }}
                >
                  {projectWithMostTasks.project.name}
                </Title>
                <Group justify="center">
                  <Badge size="lg">
                    {projectWithMostTasks.taskCount} {t("tasks")}
                  </Badge>
                </Group>
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" ta="center">
                {t("No projects with tasks")}
              </Text>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {/* Task distribution by owner */}
      <Card withBorder p="md" radius="md" mt="md">
        <Text fw={500} size="lg" mb="md">
          {t("Task Distribution by Owner")}
        </Text>
        {taskDistributionByOwner.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t("No task distribution data to display")}
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {taskDistributionByOwner.slice(0, 6).map((owner) => (
              <div key={owner.userId}>
                <Group mb="xs">
                  <Avatar
                    src={owner.avatarUrl}
                    radius="xl"
                    size="sm"
                    color={owner.userId === "unassigned" ? "gray" : undefined}
                  >
                    {owner.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Group justify="space-between">
                      <Text size="sm" fw={500} lineClamp={1}>
                        {owner.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {owner.completedTasks}/{owner.totalTasks} {t("tasks")}
                      </Text>
                    </Group>
                    <Progress
                      value={owner.completionRate}
                      size="sm"
                      mt={5}
                      color={
                        owner.completionRate > 75
                          ? "green"
                          : owner.completionRate > 50
                            ? "cyan"
                            : owner.completionRate > 25
                              ? "yellow"
                              : "red"
                      }
                    />
                  </div>
                </Group>
              </div>
            ))}
          </SimpleGrid>
        )}
      </Card>

      {/* Task distribution */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
        <Card withBorder p="md" radius="md">
          <Text fw={500} size="lg" mb="md">
            {t("Task Status Distribution")}
          </Text>
          <Group justify="space-between" grow mt="md">
            <Stack align="center">
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[
                  {
                    value:
                      (taskStats.inProgressTasks / taskStats.totalTasks) *
                        100 || 0,
                    color: theme.colors.blue[6],
                  },
                ]}
                label={
                  <Text fw={700} ta="center" size="lg">
                    {taskStats.inProgressTasks}
                  </Text>
                }
              />
              <Text size="xs" c="dimmed" ta="center">
                {t("In Progress")}
              </Text>
            </Stack>

            <Stack align="center">
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[
                  {
                    value:
                      (taskStats.completedTasks / taskStats.totalTasks) * 100 ||
                      0,
                    color: theme.colors.green[6],
                  },
                ]}
                label={
                  <Text fw={700} ta="center" size="lg">
                    {taskStats.completedTasks}
                  </Text>
                }
              />
              <Text size="xs" c="dimmed" ta="center">
                {t("Completed")}
              </Text>
            </Stack>

            <Stack align="center">
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[
                  {
                    value:
                      (taskStats.blockedTasks / taskStats.totalTasks) * 100 ||
                      0,
                    color: theme.colors.red[6],
                  },
                ]}
                label={
                  <Text fw={700} ta="center" size="lg">
                    {taskStats.blockedTasks}
                  </Text>
                }
              />
              <Text size="xs" c="dimmed" ta="center">
                {t("Blocked")}
              </Text>
            </Stack>
          </Group>
        </Card>

        <Card withBorder p="md" radius="md">
          <Text fw={500} size="lg" mb="md">
            {t("Deadline Status")}
          </Text>
          <Group justify="space-between" grow mt="md">
            <Stack align="center">
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[
                  {
                    value:
                      (taskStats.overdueTasks / taskStats.tasksWithDueDate) *
                        100 || 0,
                    color: theme.colors.red[6],
                  },
                ]}
                label={
                  <Text fw={700} ta="center" size="lg">
                    {taskStats.overdueTasks}
                  </Text>
                }
              />
              <Text size="xs" c="dimmed" ta="center">
                {t("Overdue")}
              </Text>
            </Stack>

            <Stack align="center">
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[
                  {
                    value:
                      (taskStats.dueSoonTasks / taskStats.tasksWithDueDate) *
                        100 || 0,
                    color: theme.colors.yellow[6],
                  },
                ]}
                label={
                  <Text fw={700} ta="center" size="lg">
                    {taskStats.dueSoonTasks}
                  </Text>
                }
              />
              <Text size="xs" c="dimmed" ta="center">
                {t("Due Soon")}
              </Text>
            </Stack>

            <Stack align="center">
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[
                  {
                    value:
                      ((taskStats.tasksWithDueDate -
                        taskStats.dueSoonTasks -
                        taskStats.overdueTasks) /
                        taskStats.tasksWithDueDate) *
                        100 || 0,
                    color: theme.colors.green[6],
                  },
                ]}
                label={
                  <Text fw={700} ta="center" size="lg">
                    {taskStats.tasksWithDueDate -
                      taskStats.dueSoonTasks -
                      taskStats.overdueTasks}
                  </Text>
                }
              />
              <Text size="xs" c="dimmed" ta="center">
                {t("On Track")}
              </Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>
    </>
  );
}
