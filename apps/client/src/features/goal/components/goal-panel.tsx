import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createGoal, deleteGoal, listGoals } from "@/features/goal/services/goal-service";
import { Goal, GoalHorizon } from "@/features/goal/types";
import { notifications } from "@mantine/notifications";
import { queryClient } from "@/main";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";

interface GoalPanelProps {
  workspaceId: string;
  spaceId?: string;
}

const horizonOptions: { value: GoalHorizon; label: string }[] = [
  { value: "short", label: "Short-term" },
  { value: "mid", label: "Mid-term" },
  { value: "long", label: "Long-term" },
];

export function GoalPanel({ workspaceId, spaceId }: GoalPanelProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon>("short");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");

  const goalsQuery = useQuery({
    queryKey: ["goals", workspaceId, spaceId],
    queryFn: () => listGoals({ workspaceId, spaceId }),
    enabled: !!workspaceId,
  });

  const goalLinksQuery = useQuery({
    queryKey: ["goal-entity-links", workspaceId, spaceId, goalsQuery.data],
    queryFn: () =>
      agentMemoryService.links({
        workspaceId,
        spaceId,
        goalIds: (goalsQuery.data || []).map((goal) => goal.id),
      }),
    enabled: !!workspaceId && !!goalsQuery.data?.length,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createGoal({
        workspaceId,
        spaceId,
        name,
        horizon,
        description: description.trim() || undefined,
        keywords: keywords
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      notifications.show({
        title: "Goal created",
        message: "Goal added to your roadmap",
        color: "green",
      });
      setName("");
      setDescription("");
      setKeywords("");
      setHorizon("short");
      close();
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to create goal",
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (goalId: string) => deleteGoal({ workspaceId, goalId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const groupedGoals = useMemo(() => {
    const goals = goalsQuery.data || [];
    return {
      short: goals.filter((goal) => goal.horizon === "short"),
      mid: goals.filter((goal) => goal.horizon === "mid"),
      long: goals.filter((goal) => goal.horizon === "long"),
    } as Record<GoalHorizon, Goal[]>;
  }, [goalsQuery.data]);

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={4}>Goals</Title>
          <Button size="xs" variant="light" onClick={open}>
            Add goal
          </Button>
        </Group>
        {goalsQuery.isLoading ? (
          <Text size="sm" c="dimmed">
            Loading goals...
          </Text>
        ) : (
          <Stack gap="sm">
            {(["short", "mid", "long"] as GoalHorizon[]).map((bucket) => (
              <Stack key={bucket} gap={4}>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    {bucket === "short"
                      ? "Short-term"
                      : bucket === "mid"
                        ? "Mid-term"
                        : "Long-term"}
                  </Text>
                  <Badge size="xs" variant="light">
                    {groupedGoals[bucket]?.length || 0}
                  </Badge>
                </Group>
                {groupedGoals[bucket]?.length ? (
                  groupedGoals[bucket].map((goal) => {
                    const entityLinks =
                      goalLinksQuery.data?.goalLinks?.[goal.id] || [];
                    return (
                      <Card key={goal.id} withBorder radius="sm" p="sm">
                        <Stack gap={4}>
                          <Group justify="space-between">
                            <Text fw={600} size="sm">
                              {goal.name}
                            </Text>
                            <Button
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={() => deleteMutation.mutate(goal.id)}
                            >
                              Remove
                            </Button>
                          </Group>
                          {goal.description ? (
                            <Text size="xs" c="dimmed">
                              {goal.description}
                            </Text>
                          ) : null}
                          {goal.keywords?.length ? (
                            <Group gap={6}>
                              {goal.keywords.map((keyword) => (
                                <Badge key={keyword} size="xs" variant="light">
                                  {keyword}
                                </Badge>
                              ))}
                            </Group>
                          ) : (
                            <Text size="xs" c="dimmed">
                              No keywords set
                            </Text>
                          )}
                          {entityLinks.length ? (
                            <Group gap={6} wrap="wrap">
                              {entityLinks.map((entity) => (
                                <Badge
                                  key={entity.entityId}
                                  size="xs"
                                  variant="light"
                                  color="yellow"
                                >
                                  {entity.entityName || "Entity"}
                                </Badge>
                              ))}
                            </Group>
                          ) : null}
                        </Stack>
                      </Card>
                    );
                  })
                ) : (
                  <Text size="xs" c="dimmed">
                    No goals yet
                  </Text>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>

      <Modal opened={opened} onClose={close} title="New goal">
        <Divider my="sm" />
        <Stack gap="sm">
          <TextInput
            label="Goal name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <Select
            label="Horizon"
            data={horizonOptions}
            value={horizon}
            onChange={(value) =>
              setHorizon((value as GoalHorizon) || "short")
            }
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            minRows={3}
          />
          <TextInput
            label="Keywords"
            placeholder="Comma-separated keywords for auto-linking"
            value={keywords}
            onChange={(event) => setKeywords(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim()}
              loading={createMutation.isPending}
            >
              Create goal
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
