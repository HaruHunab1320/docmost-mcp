import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CopyButton,
  Divider,
  Group,
  NumberInput,
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
  runAgentLoop,
  runAgentSchedule,
  updateAgentSettings,
} from "@/features/agent/services/agent-service";
import { notifications } from "@mantine/notifications";
import { AgentSettings } from "@/features/agent/types/agent.types";
import { useAtom } from "jotai";
import { currentUserAtom } from "@/features/user/atoms/current-user-atom";
import useUserRole from "@/hooks/use-user-role";
import { getSpaces } from "@/features/space/services/space-service";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";

const toLabel = (text: string) => text;

export function AgentSettingsPanel() {
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const workspace = currentUser?.workspace;
  const { isAdmin } = useUserRole();
  const [handoffKey, setHandoffKey] = useState("");
  const [policyDraft, setPolicyDraft] = useState({
    allowAutoApply: "",
    requireApproval: "",
    deny: "",
  });
  const [defaultTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["agent-settings"],
    queryFn: () => getAgentSettings(),
    enabled: !!workspace?.id,
  });

  const spacesQuery = useQuery({
    queryKey: ["spaces"],
    queryFn: () => getSpaces({ page: 1, limit: 200 }),
    enabled: !!workspace?.id,
  });

  const recentRunsQuery = useQuery({
    queryKey: ["agent-loop-runs", workspace?.id],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId: workspace?.id || "",
        sources: ["agent-loop"],
        limit: 5,
      }),
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
    () => {
      const defaults: AgentSettings = {
        policy: {
          allowAutoApply: [],
          requireApproval: [],
          deny: [],
        },
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
        autonomySchedule: {
          dailyEnabled: true,
          dailyHour: 7,
          weeklyEnabled: true,
          weeklyDay: 1,
          monthlyEnabled: true,
          monthlyDay: 1,
          timezone: defaultTimezone,
        },
        spaceOverrides: {},
      };

      if (!settingsQuery.data) {
        return defaults;
      }

      return {
        ...defaults,
        ...settingsQuery.data,
        policy: {
          ...defaults.policy,
          ...settingsQuery.data.policy,
        },
        autonomySchedule: {
          ...defaults.autonomySchedule,
          ...settingsQuery.data.autonomySchedule,
        },
        spaceOverrides: settingsQuery.data.spaceOverrides || {},
      };
    },
    [settingsQuery.data, defaultTimezone]
  );

  useEffect(() => {
    if (!settingsQuery.data) return;
    setCurrentUser((prev) => {
      if (!prev?.workspace) return prev;
      const existing = prev.workspace.settings?.agent;
      if (existing === settingsQuery.data) return prev;
      return {
        ...prev,
        workspace: {
          ...prev.workspace,
          settings: {
            ...prev.workspace.settings,
            agent: settingsQuery.data,
          },
        },
      };
    });
  }, [settingsQuery.data, setCurrentUser]);

  useEffect(() => {
    setPolicyDraft({
      allowAutoApply: (currentSettings.policy?.allowAutoApply || []).join(", "),
      requireApproval: (currentSettings.policy?.requireApproval || []).join(", "),
      deny: (currentSettings.policy?.deny || []).join(", "),
    });
  }, [currentSettings.policy]);

  const handleToggle = (key: keyof AgentSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    mutation.mutate({ [key]: event.currentTarget.checked });
  };

  const updateSchedule = (updates: Partial<AgentSettings["autonomySchedule"]>) => {
    mutation.mutate({
      autonomySchedule: {
        ...currentSettings.autonomySchedule,
        ...updates,
      },
    });
  };

  const updatePolicy = () => {
    const parseList = (value: string) =>
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    mutation.mutate({
      policy: {
        allowAutoApply: parseList(policyDraft.allowAutoApply),
        requireApproval: parseList(policyDraft.requireApproval),
        deny: parseList(policyDraft.deny),
      },
    });
  };

  const updateSpaceOverride = (
    spaceId: string,
    updates: Partial<AgentSettings["autonomySchedule"]>
  ) => {
    const existing = currentSettings.spaceOverrides?.[spaceId]?.autonomySchedule || {};
    mutation.mutate({
      spaceOverrides: {
        ...(currentSettings.spaceOverrides || {}),
        [spaceId]: {
          autonomySchedule: {
            ...currentSettings.autonomySchedule,
            ...existing,
            ...updates,
          },
        },
      },
    });
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

  const scheduleMutation = useMutation({
    mutationFn: () => runAgentSchedule(),
    onSuccess: () => {
      notifications.show({
        title: "Scheduled run started",
        message: "Autonomy cycle triggered for enabled spaces.",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["agent-settings"] });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to trigger autonomy schedule",
        color: "red",
      });
    },
  });

  const runSpaceMutation = useMutation({
    mutationFn: (spaceId: string) => runAgentLoop({ spaceId }),
    onSuccess: () => {
      notifications.show({
        title: "Autonomy cycle started",
        message: "Agent loop kicked off for this space.",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to run agent loop for this space",
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
          <Text size="sm" fw={600}>
            Agent policy rules
          </Text>
          <Text size="xs" c="dimmed">
            Comma-separated MCP methods (ex: task.create, page.create).
          </Text>
          <TextInput
            label="Auto-apply allowlist"
            placeholder="task.update, page.create"
            value={policyDraft.allowAutoApply}
            onChange={(event) =>
              setPolicyDraft((prev) => ({
                ...prev,
                allowAutoApply: event.currentTarget.value,
              }))
            }
            disabled={!isAdmin}
          />
          <TextInput
            label="Require approval"
            placeholder="project.create, task.create"
            value={policyDraft.requireApproval}
            onChange={(event) =>
              setPolicyDraft((prev) => ({
                ...prev,
                requireApproval: event.currentTarget.value,
              }))
            }
            disabled={!isAdmin}
          />
          <TextInput
            label="Deny list"
            placeholder="workspace.delete"
            value={policyDraft.deny}
            onChange={(event) =>
              setPolicyDraft((prev) => ({
                ...prev,
                deny: event.currentTarget.value,
              }))
            }
            disabled={!isAdmin}
          />
          <Group justify="flex-end">
            <Button
              size="xs"
              variant="light"
              onClick={updatePolicy}
              disabled={!isAdmin}
            >
              Save policy rules
            </Button>
          </Group>
        </Stack>
        <Divider />
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Autonomy cadence
          </Text>
          <Switch
            label={toLabel("Run daily")}
            checked={currentSettings.autonomySchedule.dailyEnabled}
            onChange={(event) =>
              updateSchedule({ dailyEnabled: event.currentTarget.checked })
            }
            disabled={!isAdmin}
          />
          <NumberInput
            label="Daily hour"
            min={0}
            max={23}
            value={currentSettings.autonomySchedule.dailyHour}
            onChange={(value) =>
              updateSchedule({ dailyHour: Number(value) || 0 })
            }
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Run weekly")}
            checked={currentSettings.autonomySchedule.weeklyEnabled}
            onChange={(event) =>
              updateSchedule({ weeklyEnabled: event.currentTarget.checked })
            }
            disabled={!isAdmin}
          />
          <NumberInput
            label="Weekly day (0=Sun)"
            min={0}
            max={6}
            value={currentSettings.autonomySchedule.weeklyDay}
            onChange={(value) =>
              updateSchedule({ weeklyDay: Number(value) || 0 })
            }
            disabled={!isAdmin}
          />
          <Switch
            label={toLabel("Run monthly")}
            checked={currentSettings.autonomySchedule.monthlyEnabled}
            onChange={(event) =>
              updateSchedule({ monthlyEnabled: event.currentTarget.checked })
            }
            disabled={!isAdmin}
          />
          <NumberInput
            label="Monthly day"
            min={1}
            max={28}
            value={currentSettings.autonomySchedule.monthlyDay}
            onChange={(value) =>
              updateSchedule({ monthlyDay: Number(value) || 1 })
            }
            disabled={!isAdmin}
          />
          <TextInput
            label="Timezone"
            placeholder="America/Los_Angeles"
            value={currentSettings.autonomySchedule.timezone || defaultTimezone}
            onChange={(event) =>
              updateSchedule({ timezone: event.currentTarget.value || "UTC" })
            }
            disabled={!isAdmin}
          />
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Last daily run:{" "}
              {currentSettings.autonomySchedule.lastDailyRun || "Never"}
            </Text>
            <Button
              size="xs"
              variant="light"
              onClick={() => scheduleMutation.mutate()}
              loading={scheduleMutation.isPending}
              disabled={!isAdmin}
            >
              Run cadence now
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            Last weekly run:{" "}
            {currentSettings.autonomySchedule.lastWeeklyRun || "Never"}
          </Text>
          <Text size="xs" c="dimmed">
            Last monthly run:{" "}
            {currentSettings.autonomySchedule.lastMonthlyRun || "Never"}
          </Text>
          <Text size="xs" c="dimmed">
            Schedule runs in the selected timezone. Daily hour is shared across weekly/monthly runs.
          </Text>
        </Stack>
        <Divider />
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Space overrides
          </Text>
          {spacesQuery.data?.items?.length ? (
            <Stack gap="xs">
              {spacesQuery.data.items.map((space) => {
                const override =
                  currentSettings.spaceOverrides?.[space.id]?.autonomySchedule;
                const effective = {
                  ...currentSettings.autonomySchedule,
                  ...(override || {}),
                };
                const overrideActive = Boolean(override);
                return (
                  <Card key={space.id} withBorder radius="sm" p="sm">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={600}>
                        {space.name || "Space"}
                      </Text>
                      <Group>
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => runSpaceMutation.mutate(space.id)}
                          loading={runSpaceMutation.isPending && runSpaceMutation.variables === space.id}
                          disabled={!isAdmin}
                        >
                          Run this space
                        </Button>
                        <Switch
                          label="Override"
                          checked={Boolean(override)}
                          onChange={(event) => {
                            if (event.currentTarget.checked) {
                              updateSpaceOverride(space.id, {});
                            } else {
                              const nextOverrides = {
                                ...(currentSettings.spaceOverrides || {}),
                              };
                              delete nextOverrides[space.id];
                              mutation.mutate({
                                spaceOverrides: nextOverrides,
                              });
                            }
                          }}
                          disabled={!isAdmin}
                        />
                      </Group>
                    </Group>
                    <Group grow>
                      <NumberInput
                        label="Daily hour"
                        min={0}
                        max={23}
                        value={effective.dailyHour}
                        onChange={(value) =>
                          updateSpaceOverride(space.id, { dailyHour: Number(value) || 0 })
                        }
                        disabled={!isAdmin || !overrideActive}
                      />
                      <NumberInput
                        label="Weekly day (0=Sun)"
                        min={0}
                        max={6}
                        value={effective.weeklyDay}
                        onChange={(value) =>
                          updateSpaceOverride(space.id, { weeklyDay: Number(value) || 0 })
                        }
                        disabled={!isAdmin || !overrideActive}
                      />
                    </Group>
                    <Group grow mt="xs">
                      <NumberInput
                        label="Monthly day"
                        min={1}
                        max={28}
                        value={effective.monthlyDay}
                        onChange={(value) =>
                          updateSpaceOverride(space.id, { monthlyDay: Number(value) || 1 })
                        }
                        disabled={!isAdmin || !overrideActive}
                      />
                      <TextInput
                        label="Timezone"
                        value={effective.timezone || defaultTimezone}
                        onChange={(event) =>
                          updateSpaceOverride(space.id, {
                            timezone: event.currentTarget.value || "UTC",
                          })
                        }
                        disabled={!isAdmin || !overrideActive}
                      />
                    </Group>
                    <Group mt="xs">
                      <Switch
                        label="Daily"
                        checked={effective.dailyEnabled}
                        onChange={(event) =>
                          updateSpaceOverride(space.id, {
                            dailyEnabled: event.currentTarget.checked,
                          })
                        }
                        disabled={!isAdmin || !overrideActive}
                      />
                      <Switch
                        label="Weekly"
                        checked={effective.weeklyEnabled}
                        onChange={(event) =>
                          updateSpaceOverride(space.id, {
                            weeklyEnabled: event.currentTarget.checked,
                          })
                        }
                        disabled={!isAdmin || !overrideActive}
                      />
                      <Switch
                        label="Monthly"
                        checked={effective.monthlyEnabled}
                        onChange={(event) =>
                          updateSpaceOverride(space.id, {
                            monthlyEnabled: event.currentTarget.checked,
                          })
                        }
                        disabled={!isAdmin || !overrideActive}
                      />
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          ) : (
            <Text size="xs" c="dimmed">
              No spaces found.
            </Text>
          )}
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
        <Divider />
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Recent autonomy runs
          </Text>
          {recentRunsQuery.isLoading ? (
            <Text size="xs" c="dimmed">
              Loading runs...
            </Text>
          ) : recentRunsQuery.data?.length ? (
            <Stack gap="xs">
              {recentRunsQuery.data.map((run) => {
                const content = run.content as Record<string, any> | undefined;
                const actions = Array.isArray(content?.actions) ? content?.actions : [];
                return (
                  <Card key={run.id} withBorder radius="sm" p="sm">
                    <Stack gap={4}>
                      <Group justify="space-between">
                        <Text size="sm" fw={600}>
                          {run.summary || "Autonomy run"}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {run.timestamp
                            ? new Date(run.timestamp).toLocaleString()
                            : ""}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Actions: {actions.length}
                      </Text>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          ) : (
            <Text size="xs" c="dimmed">
              No runs recorded yet.
            </Text>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
