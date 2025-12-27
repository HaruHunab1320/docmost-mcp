import { useTranslation } from "react-i18next";
import { Button, Group, Stack, TextInput, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWorkspaceIntegrations,
  updateWorkspaceIntegrations,
} from "@/features/workspace/services/workspace-service";
import { notifications } from "@mantine/notifications";

type RepoTokensForm = {
  githubToken: string;
  gitlabToken: string;
  bitbucketToken: string;
};

export function WorkspaceRepoTokensPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const integrationsQuery = useQuery({
    queryKey: ["workspace-integrations"],
    queryFn: () => getWorkspaceIntegrations(),
  });

  const form = useForm<RepoTokensForm>({
    initialValues: {
      githubToken: "",
      gitlabToken: "",
      bitbucketToken: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: RepoTokensForm) =>
      updateWorkspaceIntegrations({
        repoTokens: {
          githubToken: values.githubToken || undefined,
          gitlabToken: values.gitlabToken || undefined,
          bitbucketToken: values.bitbucketToken || undefined,
        },
      }),
    onSuccess: () => {
      notifications.show({
        title: t("Saved"),
        message: t("Repository tokens updated"),
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["workspace-integrations"] });
    },
    onError: () => {
      notifications.show({
        title: t("Error"),
        message: t("Failed to update repository tokens"),
        color: "red",
      });
    },
  });

  const loadedTokens = integrationsQuery.data?.repoTokens;

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        {t(
          "Store personal access tokens for private repository browsing. Tokens are stored per workspace."
        )}
      </Text>
      <TextInput
        label={t("GitHub token")}
        placeholder="ghp_..."
        type="password"
        {...form.getInputProps("githubToken")}
      />
      {loadedTokens?.githubToken ? (
        <Text size="xs" c="dimmed">
          {t("GitHub token saved")}
        </Text>
      ) : null}
      <TextInput
        label={t("GitLab token")}
        placeholder="glpat-..."
        type="password"
        {...form.getInputProps("gitlabToken")}
      />
      {loadedTokens?.gitlabToken ? (
        <Text size="xs" c="dimmed">
          {t("GitLab token saved")}
        </Text>
      ) : null}
      <TextInput
        label={t("Bitbucket token")}
        placeholder={t("Bitbucket app password or token")}
        type="password"
        {...form.getInputProps("bitbucketToken")}
      />
      {loadedTokens?.bitbucketToken ? (
        <Text size="xs" c="dimmed">
          {t("Bitbucket token saved")}
        </Text>
      ) : null}
      <Group justify="flex-end">
        <Button
          loading={updateMutation.isPending}
          onClick={() => {
            const hasInput =
              form.values.githubToken ||
              form.values.gitlabToken ||
              form.values.bitbucketToken;
            if (!hasInput) {
              notifications.show({
                title: t("No changes"),
                message: t("Enter a token to update"),
                color: "yellow",
              });
              return;
            }
            updateMutation.mutate(form.values);
          }}
        >
          {t("Save tokens")}
        </Button>
      </Group>
    </Stack>
  );
}
