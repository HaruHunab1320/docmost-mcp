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
import { useTasksBySpace } from "@/features/project/hooks/use-tasks";
import {
  TaskBucket,
  filterTasksByBucket,
  clearTaskBucket,
} from "@/features/gtd/utils/task-buckets";
import { TaskCard } from "@/features/project/components/task-card";
import { TaskDrawer } from "@/features/project/components/task-drawer";

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

  const { data: tasksData, isLoading } = useTasksBySpace({
    spaceId: spaceId || "",
    page: 1,
    limit: 200,
  });

  const bucketTasks = useMemo(() => {
    const tasks = tasksData?.items || [];
    return filterTasksByBucket(spaceId || "", tasks, bucket);
  }, [bucket, spaceId, tasksData?.items]);

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
              selectedTaskIds.forEach((taskId) =>
                clearTaskBucket(spaceId, taskId)
              );
              setSelectedTaskIds([]);
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
                    onClick={() => clearTaskBucket(spaceId, task.id)}
                  >
                    {t("Return to Inbox")}
                  </Button>
                </Group>
              </Stack>
            </Group>
          ))}
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
