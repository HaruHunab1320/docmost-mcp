import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { confirmApproval, listApprovals, rejectApproval } from "@/features/agent/services/agent-service";
import { queryClient } from "@/main";

export function AgentApprovalsPanel() {
  const approvalsQuery = useQuery({
    queryKey: ["agent-approvals"],
    queryFn: () => listApprovals(),
  });

  const confirmMutation = useMutation({
    mutationFn: (token: string) => confirmApproval(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-approvals"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (token: string) => rejectApproval(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-approvals"] });
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
                      loading={rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      size="xs"
                      onClick={() => confirmMutation.mutate(approval.token)}
                      loading={confirmMutation.isPending}
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
