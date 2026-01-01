import { Card, Group, Stack, Text, Title, TypographyStylesProvider } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";
import { marked } from "marked";
import DOMPurify from "dompurify";
import classes from "./agent-daily-summary.module.css";

marked.use({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
});

interface AgentDailySummaryProps {
  workspaceId: string;
  spaceId?: string;
}

export function AgentDailySummary({ workspaceId, spaceId }: AgentDailySummaryProps) {
  const summaryQuery = useQuery({
    queryKey: ["agent-daily-summary", workspaceId, spaceId],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId,
        spaceId,
        tags: ["daily-summary"],
        limit: 1,
      }),
    enabled: !!workspaceId,
  });

  const summary = summaryQuery.data?.[0];
  const content = summary?.content as { text?: string } | undefined;
  const html = content?.text ? marked.parse(content.text) : "";
  const sanitized = content?.text ? DOMPurify.sanitize(html) : "";

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={4}>Agent Summary</Title>
          <Text size="xs" c="dimmed">
            Today
          </Text>
        </Group>
        {summaryQuery.isLoading ? (
          <Text size="sm" c="dimmed">
            Loading summary...
          </Text>
        ) : summary ? (
          <TypographyStylesProvider className={classes.markdown}>
            <div dangerouslySetInnerHTML={{ __html: sanitized }} />
          </TypographyStylesProvider>
        ) : (
          <Text size="sm" c="dimmed">
            No summary yet.
          </Text>
        )}
      </Stack>
    </Card>
  );
}
