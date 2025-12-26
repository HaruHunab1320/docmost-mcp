import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";
import { sendAgentChat } from "@/features/agent/services/agent-service";
import { queryClient } from "@/main";

interface AgentChatPanelProps {
  workspaceId: string;
  spaceId: string;
  pageId?: string;
  contextLabel?: string;
  allowChat?: boolean;
  variant?: "card" | "plain";
}

export function AgentChatPanel({
  workspaceId,
  spaceId,
  pageId,
  contextLabel,
  allowChat = true,
  variant = "card",
}: AgentChatPanelProps) {
  const [message, setMessage] = useState("");
  const chatTag = pageId ? `agent-chat-page:${pageId}` : "agent-chat";
  const queryKey = ["agent-chat", workspaceId, spaceId, chatTag];

  const chatQuery = useQuery({
    queryKey,
    queryFn: () =>
      agentMemoryService.query({
        workspaceId,
        spaceId,
        tags: [chatTag],
        limit: 30,
      }),
    enabled: !!workspaceId && !!spaceId,
  });

  const mutation = useMutation({
    mutationFn: () => sendAgentChat({ spaceId, message, pageId }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const messages = useMemo(() => {
    const items = chatQuery.data || [];
    return items
      .slice()
      .sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return aTime - bTime;
      })
      .map((item) => ({
        id: item.id,
        role: item.tags?.includes("assistant") ? "assistant" : "user",
        text:
          typeof item.content === "object" && item.content !== null && "text" in item.content
            ? (item.content as { text?: string }).text || ""
            : typeof item.content === "string"
              ? item.content
              : item.summary || "",
      }));
  }, [chatQuery.data]);

  const content = (
    <Stack gap="sm">
      {variant === "card" ? <Title order={4}>Agent Chat</Title> : null}
      <Stack gap="xs">
        {messages.length ? (
          messages.map((item) => (
            <Group
              key={item.id}
              justify={item.role === "user" ? "flex-end" : "flex-start"}
            >
              <Text
                size="sm"
                style={{
                  maxWidth: "70%",
                  padding: "8px 12px",
                  borderRadius: 12,
                  background:
                    item.role === "user"
                      ? "var(--mantine-color-blue-light)"
                      : "var(--mantine-color-gray-light)",
                }}
              >
                {item.text}
              </Text>
            </Group>
          ))
      ) : (
        <Text size="sm" c="dimmed">
          No messages yet.
        </Text>
      )}
    </Stack>
    {contextLabel ? (
      <Group>
        <Badge size="sm" variant="light" color="gray">
          {contextLabel}
        </Badge>
      </Group>
    ) : null}
    <Textarea
      value={message}
      onChange={(event) => setMessage(event.currentTarget.value)}
        placeholder="Ask the agent..."
        minRows={2}
        disabled={!allowChat}
      />
      <Group justify="flex-end">
        <Button
          onClick={() => mutation.mutate()}
          disabled={!message.trim() || !allowChat}
          loading={mutation.isPending}
        >
          Send
        </Button>
      </Group>
      {!allowChat && (
        <Text size="xs" c="dimmed">
          Agent chat is disabled in workspace settings.
        </Text>
      )}
    </Stack>
  );

  return variant === "plain" ? (
    content
  ) : (
    <Card withBorder radius="md" p="md">
      {content}
    </Card>
  );
}
