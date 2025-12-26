import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePagedSpaceTasks } from "@/features/gtd/hooks/use-paged-space-tasks";
import {
  TaskBucket,
  filterTasksByBucket,
} from "@/features/gtd/utils/task-buckets";
import { TaskCard } from "@/features/project/components/task-card";
import { TaskDrawer } from "@/features/project/components/task-drawer";
import { projectService } from "@/features/project/services/project-service";
import { queryClient } from "@/main";

interface BucketPageProps {
  bucket: TaskBucket;
  title: string;
  emptyMessage: string;
}

export function BucketPage({ bucket, title, emptyMessage }: BucketPageProps) {
  const { t } = useTranslation();
  const { spaceId } = useParams<{ spaceId: string }>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const { items: tasks, isLoading, hasNextPage, loadMore } =
    usePagedSpaceTasks(spaceId || "");

  const bucketTasks = useMemo(() => {
    return filterTasksByBucket(tasks, bucket);
  }, [bucket, tasks]);

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
        <Title order={2}>{t(title)}</Title>
        <Group>
          <Button
            variant="subtle"
            disabled={!selectedTaskIds.length}
            onClick={() => {
              Promise.all(
                selectedTaskIds.map((taskId) =>
                  projectService.updateTask({ taskId, bucket: "none" })
                )
              ).finally(() => {
                queryClient.invalidateQueries({ queryKey: ["space-tasks"] });
                setSelectedTaskIds([]);
              });
            }}
          >
            {t("Return selected")}
          </Button>
        </Group>
      </Group>

      {isLoading ? (
        <Text size="sm" c="dimmed">
          {t("Loading...")}
        </Text>
      ) : bucketTasks.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t(emptyMessage)}
        </Text>
      ) : (
        <Stack gap="md">
          <Group>
            <Checkbox
              checked={
                bucketTasks.length > 0 &&
                selectedTaskIds.length === bucketTasks.length
              }
              indeterminate={
                selectedTaskIds.length > 0 &&
                selectedTaskIds.length < bucketTasks.length
              }
              onChange={() => {
                if (selectedTaskIds.length === bucketTasks.length) {
                  setSelectedTaskIds([]);
                  return;
                }
                setSelectedTaskIds(bucketTasks.map((task) => task.id));
              }}
            />
            <Text size="sm" c="dimmed">
              {t("Selected {{count}}", { count: selectedTaskIds.length })}
            </Text>
          </Group>
          {bucketTasks.map((task) => (
            <Group key={task.id} align="flex-start" wrap="nowrap">
              <Checkbox
                mt={6}
                checked={selectedTaskIds.includes(task.id)}
                onChange={() =>
                  setSelectedTaskIds((prev) =>
                    prev.includes(task.id)
                      ? prev.filter((id) => id !== task.id)
                      : [...prev, task.id]
                  )
                }
              />
              <Stack style={{ flex: 1 }} gap="xs">
                <TaskCard
                  task={task}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setDrawerOpened(true);
                  }}
                />
                <Group justify="flex-end">
                  <Button
                    variant="subtle"
                    onClick={() => {
                      projectService
                        .updateTask({ taskId: task.id, bucket: "none" })
                        .finally(() => {
                          queryClient.invalidateQueries({
                            queryKey: ["space-tasks"],
                          });
                        });
                    }}
                  >
                    {t("Return to Inbox")}
                  </Button>
                </Group>
              </Stack>
            </Group>
          ))}
          {hasNextPage && (
            <Button variant="light" onClick={loadMore}>
              {t("Load more")}
            </Button>
          )}
        </Stack>
      )}

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          opened={drawerOpened}
          onClose={() => setDrawerOpened(false)}
          spaceId={spaceId}
        />
      )}
    </Container>
  );
}
