import { useState } from "react";
import { Stack, Text } from "@mantine/core";
import { Task } from "@/features/project/types";
import { TaskCard } from "@/features/project/components/task-card";
import { TaskDrawer } from "@/features/project/components/task-drawer";

interface GtdTaskListProps {
  tasks: Task[];
  spaceId: string;
  emptyMessage: string;
}

export function GtdTaskList({
  tasks,
  spaceId,
  emptyMessage,
}: GtdTaskListProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpened, setDrawerOpened] = useState(false);

  if (tasks.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <>
      <Stack gap="sm">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => {
              setSelectedTaskId(task.id);
              setDrawerOpened(true);
            }}
          />
        ))}
      </Stack>

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          opened={drawerOpened}
          onClose={() => setDrawerOpened(false)}
          spaceId={spaceId}
        />
      )}
    </>
  );
}
