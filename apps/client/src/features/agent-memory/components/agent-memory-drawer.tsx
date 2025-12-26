import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";

marked.use({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
});

interface AgentMemoryDrawerProps {
  opened: boolean;
  onClose: () => void;
  workspaceId: string;
  spaceId?: string;
}

const formatDayLabel = (day: string) => {
  const parsed = new Date(day);
  if (Number.isNaN(parsed.getTime())) return day;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export function AgentMemoryDrawer({
  opened,
  onClose,
  workspaceId,
  spaceId,
}: AgentMemoryDrawerProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [queryText, setQueryText] = useState("");

  const defaultDay = useMemo(
    () => new Date().toISOString().slice(0, 10),
    []
  );

  const daysQuery = useQuery({
    queryKey: ["memory-days", workspaceId, spaceId],
    queryFn: () =>
      agentMemoryService.days({
        workspaceId,
        spaceId,
        days: 14,
      }),
    enabled: opened && !!workspaceId,
  });

  useEffect(() => {
    if (!opened) return;
    if (selectedDay) return;
    if (daysQuery.data?.length) {
      setSelectedDay(daysQuery.data[0].day);
      return;
    }
    setSelectedDay(defaultDay);
  }, [opened, selectedDay, daysQuery.data, defaultDay]);

  const dailyQuery = useQuery({
    queryKey: ["memory-daily", workspaceId, spaceId, selectedDay],
    queryFn: () =>
      agentMemoryService.daily({
        workspaceId,
        spaceId,
        date: selectedDay || undefined,
        limit: 50,
      }),
    enabled: opened && !!workspaceId && !!selectedDay && !queryText.trim(),
  });

  const searchQuery = useQuery({
    queryKey: ["memory-search", workspaceId, spaceId, queryText],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId,
        spaceId,
        query: queryText.trim(),
        limit: 50,
      }),
    enabled: opened && !!workspaceId && queryText.trim().length > 0,
  });

  const memoryEntries = queryText.trim()
    ? searchQuery.data || []
    : dailyQuery.data || [];

  const renderContent = (content: unknown) => {
    if (!content) return null;
    if (typeof content === "string") return content;
    if (typeof content === "object" && content !== null && "text" in content) {
      const value = (content as { text?: string }).text;
      if (value) return value;
    }
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Memory Stream"
      position="right"
      size="lg"
    >
      <Stack gap="md" h="100%">
        <Group justify="space-between">
          <Title order={4}>Daily Memory</Title>
          <Button
            variant="subtle"
            size="xs"
            onClick={() => setSelectedDay(defaultDay)}
          >
            Today
          </Button>
        </Group>
        <TextInput
          placeholder="Search memories..."
          value={queryText}
          onChange={(event) => setQueryText(event.currentTarget.value)}
        />

        <Group align="flex-start" gap="md" wrap="nowrap" style={{ flex: 1 }}>
          <Stack gap="xs" w={180}>
            <Text size="xs" c="dimmed">
              Recent Days
            </Text>
            <ScrollArea h={420} offsetScrollbars>
              <Stack gap="xs">
                {daysQuery.isLoading ? (
                  <Text size="xs" c="dimmed">
                    Loading days...
                  </Text>
                ) : daysQuery.data?.length ? (
                  daysQuery.data.map((day) => (
                    <Button
                      key={day.day}
                      size="xs"
                      variant={day.day === selectedDay ? "filled" : "light"}
                      onClick={() => setSelectedDay(day.day)}
                      fullWidth
                    >
                      <Group justify="space-between" w="100%">
                        <Text size="xs">{formatDayLabel(day.day)}</Text>
                        <Badge size="xs" variant="light">
                          {day.count}
                        </Badge>
                      </Group>
                    </Button>
                  ))
                ) : (
                  <Text size="xs" c="dimmed">
                    No memory days yet
                  </Text>
                )}
              </Stack>
            </ScrollArea>
          </Stack>

          <Divider orientation="vertical" />

          <Stack gap="xs" style={{ flex: 1 }}>
            <Text size="xs" c="dimmed">
              {queryText.trim() ? "Search results" : "Entries"}
            </Text>
            <ScrollArea h={420} offsetScrollbars>
              <Stack gap="sm">
                {dailyQuery.isLoading || searchQuery.isLoading ? (
                  <Text size="sm" c="dimmed">
                    Loading memories...
                  </Text>
                ) : memoryEntries.length ? (
                  <Accordion variant="separated">
                    {memoryEntries.map((memory) => {
                      const content = renderContent(memory.content);
                      const html = content ? marked.parse(String(content)) : "";
                      const sanitized = content
                        ? DOMPurify.sanitize(html)
                        : "";
                      return (
                        <Accordion.Item key={memory.id} value={memory.id}>
                          <Accordion.Control>
                            <Stack gap={4}>
                              <Text fw={600} size="sm">
                                {memory.summary || "Untitled memory"}
                              </Text>
                              {memory.tags?.length ? (
                                <Group gap={6}>
                                  {memory.tags.map((tag) => (
                                    <Badge size="xs" variant="light" key={tag}>
                                      {tag}
                                    </Badge>
                                  ))}
                                </Group>
                              ) : null}
                              <Text size="xs" c="dimmed">
                                {memory.source || "Agent"}{" "}
                                {memory.timestamp
                                  ? `• ${new Date(
                                      memory.timestamp
                                    ).toLocaleString()}`
                                  : null}
                              </Text>
                            </Stack>
                          </Accordion.Control>
                          <Accordion.Panel>
                            {content ? (
                              <div
                                style={{ fontSize: "0.78rem" }}
                                className="editor-content"
                                dangerouslySetInnerHTML={{ __html: sanitized }}
                              />
                            ) : (
                              <Text size="xs" c="dimmed">
                                No additional details.
                              </Text>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>
                      );
                    })}
                  </Accordion>
                ) : (
                  <Text size="sm" c="dimmed">
                    {queryText.trim()
                      ? "No memories match this search."
                      : "No memories recorded for this day."}
                  </Text>
                )}
              </Stack>
            </ScrollArea>
          </Stack>
        </Group>
      </Stack>
    </Drawer>
  );
}
