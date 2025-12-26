import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { confirmApproval, listApprovals, rejectApproval } from "@/features/agent/services/agent-service";
import { queryClient } from "@/main";

export function AgentApprovalsPanel() {
  const [approvingToken, setApprovingToken] = useState<string | null>(null);
  const [rejectingToken, setRejectingToken] = useState<string | null>(null);
  const approvalsQuery = useQuery({
    queryKey: ["agent-approvals"],
    queryFn: () => listApprovals(),
  });

  const confirmMutation = useMutation({
    mutationFn: (token: string) => confirmApproval(token),
    onMutate: (token) => {
      setApprovingToken(token);
      const previous = queryClient.getQueryData<Array<{ token: string }>>([
        "agent-approvals",
      ]);
      if (previous) {
        queryClient.setQueryData(
          ["agent-approvals"],
          previous.filter((item) => item.token !== token)
        );
      }
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-approvals"] });
    },
    onError: (_error, _token, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["agent-approvals"], context.previous);
      }
    },
    onSettled: () => {
      setApprovingToken(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (token: string) => rejectApproval(token),
    onMutate: (token) => {
      setRejectingToken(token);
      const previous = queryClient.getQueryData<Array<{ token: string }>>([
        "agent-approvals",
      ]);
      if (previous) {
        queryClient.setQueryData(
          ["agent-approvals"],
          previous.filter((item) => item.token !== token)
        );
      }
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-approvals"] });
    },
    onError: (_error, _token, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["agent-approvals"], context.previous);
      }
    },
    onSettled: () => {
      setRejectingToken(null);
    },
  });

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Title order={4}>Approvals</Title>
        {approvalsQuery.isLoading ? (
          <Text size="sm" c="dimmed">
            Loading approvals...
          </Text>
        ) : approvalsQuery.data?.length ? (
          <Stack gap="xs">
            {approvalsQuery.data.map((approval) => (
              <Card key={approval.token} withBorder radius="sm" p="sm">
                <Stack gap={4}>
                  <Text size="sm" fw={600}>
                    {approval.method}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Expires {new Date(approval.expiresAt).toLocaleString()}
                  </Text>
                  <Group justify="flex-end">
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => rejectMutation.mutate(approval.token)}
                      loading={rejectingToken === approval.token}
                      disabled={approvingToken === approval.token}
                    >
                      Reject
                    </Button>
                    <Button
                      size="xs"
                      onClick={() => confirmMutation.mutate(approval.token)}
                      loading={approvingToken === approval.token}
                      disabled={rejectingToken === approval.token}
                    >
                      Approve
                    </Button>
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            No pending approvals.
          </Text>
        )}
      </Stack>
    </Card>
  );
}
