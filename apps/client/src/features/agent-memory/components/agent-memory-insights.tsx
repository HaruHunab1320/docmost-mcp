import { useMemo } from "react";
import { Card, Group, Stack, Text, Title, Badge } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";

interface AgentMemoryInsightsProps {
  workspaceId: string;
  spaceId?: string;
}

export function AgentMemoryInsights({
  workspaceId,
  spaceId,
}: AgentMemoryInsightsProps) {
  const since = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }, []);

  const memoriesQuery = useQuery({
    queryKey: ["memory-insights", workspaceId, spaceId],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId,
        spaceId,
        from: since,
        limit: 200,
      }),
    enabled: !!workspaceId,
  });

  const stats = useMemo(() => {
    const items = memoriesQuery.data || [];
    const tagCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    items.forEach((memory) => {
      memory.tags?.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
      const source = memory.source || "unknown";
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });

    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      total: items.length,
      topTags,
      topSources,
      summaryText: items.length
        ? `Captured ${items.length} memories across ${topSources.length || 1} sources.`
        : "No memories captured this week.",
    };
  }, [memoriesQuery.data]);

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={4}>Memory Insights</Title>
          <Text size="xs" c="dimmed">
            Last 7 days
          </Text>
        </Group>
        <Group>
          <Stack gap={2}>
            <Text size="xs" c="dimmed">
              Total memories
            </Text>
            <Text fw={600}>{stats.total}</Text>
          </Stack>
          <Stack gap={2}>
            <Text size="xs" c="dimmed">
              Top sources
            </Text>
            <Group gap={6}>
              {stats.topSources.length ? (
                stats.topSources.map(([source, count]) => (
                  <Badge key={source} variant="light" size="sm">
                    {source} · {count}
                  </Badge>
                ))
              ) : (
                <Text size="xs" c="dimmed">
                  None yet
                </Text>
              )}
            </Group>
          </Stack>
        </Group>
        <Text size="sm" c="dimmed">
          {stats.summaryText}
        </Text>
        <Stack gap={6}>
          <Text size="xs" c="dimmed">
            Top tags
          </Text>
          <Group gap={6}>
            {stats.topTags.length ? (
              stats.topTags.map(([tag, count]) => (
                <Badge key={tag} variant="light" size="sm">
                  {tag} · {count}
                </Badge>
              ))
            ) : (
              <Text size="xs" c="dimmed">
                No tags yet
              </Text>
            )}
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}
