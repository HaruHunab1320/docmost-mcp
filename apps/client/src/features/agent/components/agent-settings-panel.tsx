import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CopyButton,
  Divider,
  Group,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAgentHandoff,
  getAgentSettings,
  updateAgentSettings,
} from "@/features/agent/services/agent-service";
import { notifications } from "@mantine/notifications";
import { AgentSettings } from "@/features/agent/types/agent.types";
import { useAtom } from "jotai";
import { currentUserAtom } from "@/features/user/atoms/current-user-atom";
import useUserRole from "@/hooks/use-user-role";

const toLabel = (text: string) => text;

export function AgentSettingsPanel() {
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const workspace = currentUser?.workspace;
  const { isAdmin } = useUserRole();
  const [handoffKey, setHandoffKey] = useState("");
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["agent-settings"],
    queryFn: () => getAgentSettings(),
    enabled: !!workspace?.id,
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<AgentSettings>) => updateAgentSettings(data),
    onSuccess: (data) => {
      notifications.show({
        title: "Updated",
        message: "Agent settings saved",
        color: "green",
      });
      queryClient.setQueryData(["agent-settings"], data);
      if (currentUser?.workspace) {
        setCurrentUser({
          ...currentUser,
          workspace: {
            ...currentUser.workspace,
            settings: {
              ...currentUser.workspace.settings,
              agent: data,
            },
          },
        });
      }
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to update agent settings",
        color: "red",
      });
    },
  });

  const currentSettings = useMemo(
    () =>
      settingsQuery.data || {
        enabled: true,
        enableDailySummary: true,
        enableAutoTriage: true,
        enableMemoryAutoIngest: true,
        enableGoalAutoLink: true,
        enablePlannerLoop: true,
        enableProactiveQuestions: true,
        enableAutonomousLoop: false,
        enableMemoryInsights: true,
        allowAgentChat: true,
        allowTaskWrites: false,
        allowPageWrites: false,
        allowProjectWrites: false,
        allowGoalWrites: false,
      },
    [settingsQuery.data]
  );

  useEffect(() => {
    if (settingsQuery.data && currentUser?.workspace) {
      setCurrentUser({
        ...currentUser,
        workspace: {
          ...currentUser.workspace,
          settings: {
            ...currentUser.workspace.settings,
            agent: settingsQuery.data,
          },
        },
      });
    }
  }, [settingsQuery.data, currentUser, setCurrentUser]);

  const handleToggle = (key: keyof AgentSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    mutation.mutate({ [key]: event.currentTarget.checked });
  };

  const handoffMutation = useMutation({
    mutationFn: (name?: string) => createAgentHandoff({ name }),
    onSuccess: (data) => {
      setHandoffKey(data.apiKey);
      notifications.show({
        title: "Agent key created",
        message: "Copy the key now - it will only be shown once.",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to create agent handoff key",
        color: "red",
      });
    },
  });

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={4}>Agent Controls</Title>
          <Text size="xs" c="dimmed">
            Workspace-wide
          </Text>
        </Group>
        {!isAdmin && (
          <Text size="sm" c="dimmed">
            You need admin permissions to edit agent settings.
          </Text>
        )}
        <Stack gap="xs">
          <Switch
            label={toLabel("Enable agent")}
            checked={currentSettings.enabled}
            onChange={handleToggle("enabled")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Daily summaries")}
            checked={currentSettings.enableDailySummary}
            onChange={handleToggle("enableDailySummary")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Auto triage context")}
            checked={currentSettings.enableAutoTriage}
            onChange={handleToggle("enableAutoTriage")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Auto-ingest memories")}
            checked={currentSettings.enableMemoryAutoIngest}
            onChange={handleToggle("enableMemoryAutoIngest")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Auto-link tasks to goals")}
            checked={currentSettings.enableGoalAutoLink}
            onChange={handleToggle("enableGoalAutoLink")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Planner loop")}
            checked={currentSettings.enablePlannerLoop}
            onChange={handleToggle("enablePlannerLoop")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Proactive questions")}
            checked={currentSettings.enableProactiveQuestions}
            onChange={handleToggle("enableProactiveQuestions")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Autonomous agent loop")}
            checked={currentSettings.enableAutonomousLoop}
            onChange={handleToggle("enableAutonomousLoop")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Memory insights pipeline")}
            checked={currentSettings.enableMemoryInsights}
            onChange={handleToggle("enableMemoryInsights")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Allow agent chat")}
            checked={currentSettings.allowAgentChat}
            onChange={handleToggle("allowAgentChat")}
            disabled={!isAdmin}
          />
          <Group mt="xs">
            <Text size="xs" c="dimmed">
              Write permissions (off by default)
            </Text>
          </Group>
          <Switch
            label={toLabel("Allow task writes")}
            checked={currentSettings.allowTaskWrites}
            onChange={handleToggle("allowTaskWrites")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Allow page writes")}
            checked={currentSettings.allowPageWrites}
            onChange={handleToggle("allowPageWrites")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Allow project writes")}
            checked={currentSettings.allowProjectWrites}
            onChange={handleToggle("allowProjectWrites")}
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Allow goal writes")}
            checked={currentSettings.allowGoalWrites}
            onChange={handleToggle("allowGoalWrites")}
            disabled={!isAdmin}
          />
        </Stack>
        <Divider />
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              External agent access
            </Text>
            <Button
              size="xs"
              variant="light"
              onClick={() => handoffMutation.mutate("External agent handoff")}
              loading={handoffMutation.isPending}
              disabled={!isAdmin}
            >
              Generate key
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            Creates a scoped MCP API key for external agents. Store it securely.
          </Text>
          {handoffKey ? (
            <Group gap="xs" wrap="nowrap">
              <TextInput
                value={handoffKey}
                readOnly
                size="sm"
                style={{ flex: 1 }}
              />
              <CopyButton value={handoffKey}>
                {({ copied, copy }) => (
                  <Button size="xs" variant="subtle" onClick={copy}>
                    {copied ? "Copied" : "Copy"}
                  </Button>
                )}
              </CopyButton>
            </Group>
          ) : (
            <Text size="xs" c="dimmed">
              No handoff key generated yet.
            </Text>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
