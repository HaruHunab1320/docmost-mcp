import { Card, Group, List, Text, Title, Button } from "@mantine/core";
import { useQuery, useMutation } from "@tanstack/react-query";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";
import { useTranslation } from "react-i18next";
import { runAgentPlan } from "@/features/agent/services/agent-service";
import { useQueryClient } from "@tanstack/react-query";

interface AgentProactiveQuestionsProps {
  workspaceId: string;
  spaceId: string;
}

export function AgentProactiveQuestions({
  workspaceId,
  spaceId,
}: AgentProactiveQuestionsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const questionsQuery = useQuery({
    queryKey: ["agent-proactive-questions", workspaceId, spaceId],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId,
        spaceId,
        tags: ["proactive-question"],
        limit: 5,
      }),
    enabled: !!workspaceId && !!spaceId,
  });

  const runPlanMutation = useMutation({
    mutationFn: () => runAgentPlan({ spaceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-proactive-questions", workspaceId, spaceId],
      });
    },
  });

  const questions = questionsQuery.data?.[0]?.content as {
    questions?: string[];
  };
  const questionList = questions?.questions || [];

  return (
    <Card withBorder radius="md" p="md">
      <Group justify="space-between" mb="xs">
        <Title order={4}>{t("Proactive Questions")}</Title>
        <Button
          size="xs"
          variant="subtle"
          loading={runPlanMutation.isPending}
          onClick={() => runPlanMutation.mutate()}
        >
          {t("Refresh")}
        </Button>
      </Group>
      {questionsQuery.isLoading ? (
        <Text size="sm" c="dimmed">
          {t("Loading questions...")}
        </Text>
      ) : questionList.length ? (
        <List spacing="xs">
          {questionList.map((question, index) => (
            <List.Item key={`${question}-${index}`}>
              <Text size="sm">{question}</Text>
            </List.Item>
          ))}
        </List>
      ) : (
        <Text size="sm" c="dimmed">
          {t("No questions yet")}
        </Text>
      )}
    </Card>
  );
}
