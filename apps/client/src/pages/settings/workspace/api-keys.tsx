import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Paper,
  Alert,
  Anchor,
} from "@mantine/core";
import { IconPlus, IconInfoCircle, IconExternalLink } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiKeyList } from "@/features/api-keys/components/api-key-list";
import { CreateApiKeyModal } from "@/features/api-keys/components/create-api-key-modal";
import SettingsTitle from "@/components/settings/settings-title";
import useUserRole from "@/hooks/use-user-role";

export default function ApiKeysSettings() {
  const { t } = useTranslation();
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const { isAdmin, isOwner } = useUserRole();

  // Only admins and owners can manage API keys
  if (!isAdmin && !isOwner) {
    return (
      <Container>
        <Alert icon={<IconInfoCircle />} color="yellow">
          <Text size="sm">
            {t("You don't have permission to manage API keys")}
          </Text>
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Container fluid>
        <Stack gap="xl">
          <div>
            <SettingsTitle title={t("API Keys")} />
            <Text c="dimmed" size="sm" mt="xs">
              {t(
                "Manage API keys for programmatic access to Raven Docs via the Machine Control Protocol (MCP)"
              )}
            </Text>
          </div>

          <Alert icon={<IconInfoCircle />} color="blue">
            <Text size="sm">
              {t(
                "API keys provide full access to your workspace data. Keep them secure and never share them publicly."
              )}
            </Text>
            <Anchor
              href="https://modelcontextprotocol.io"
              target="_blank"
              size="sm"
              mt="xs"
            >
              <Group gap={4}>
                {t("Learn more about MCP")}
                <IconExternalLink size={14} />
              </Group>
            </Anchor>
          </Alert>

          <Paper withBorder>
            <Group p="md" justify="space-between">
              <div>
                <Title order={5}>{t("Active API Keys")}</Title>
                <Text size="sm" c="dimmed">
                  {t("View and manage your API keys")}
                </Text>
              </div>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setCreateModalOpened(true)}
              >
                {t("Create API Key")}
              </Button>
            </Group>

            <ApiKeyList />
          </Paper>

          <Paper withBorder p="md">
            <Title order={5} mb="sm">
              {t("Using API Keys")}
            </Title>
            <Stack gap="sm">
              <Text size="sm">
                {t("You can use API keys to authenticate MCP requests:")}
              </Text>
              <Paper
                withBorder
                p="sm"
                bg="var(--raven-docs-surface-bg, var(--mantine-color-body))"
              >
                <code style={{ fontSize: "0.875rem" }}>
                  Authorization: Bearer mcp_your_api_key_here
                </code>
              </Paper>
              <Text size="sm" c="dimmed">
                {t(
                  "Include this header in your HTTP requests to the MCP endpoints."
                )}
              </Text>
            </Stack>
          </Paper>

          <Paper withBorder p="md">
            <Title order={5} mb="sm">
              {t("Available Endpoints")}
            </Title>
            <Stack gap="xs">
              <Group justify="space-between">
                <code style={{ fontSize: "0.875rem" }}>
                  POST /api/mcp-standard/initialize
                </code>
                <Text size="sm" c="dimmed">
                  {t("Initialize MCP Standard")}
                </Text>
              </Group>
              <Group justify="space-between">
                <code style={{ fontSize: "0.875rem" }}>
                  POST /api/mcp-standard/list_tools
                </code>
                <Text size="sm" c="dimmed">
                  {t("List available tools")}
                </Text>
              </Group>
              <Group justify="space-between">
                <code style={{ fontSize: "0.875rem" }}>
                  POST /api/mcp-standard/call_tool
                </code>
                <Text size="sm" c="dimmed">
                  {t("Call a tool")}
                </Text>
              </Group>
              <Group justify="space-between">
                <code style={{ fontSize: "0.875rem" }}>
                  POST /api/mcp-standard/read_resource
                </code>
                <Text size="sm" c="dimmed">
                  {t("Read a resource")}
                </Text>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </Container>

      <CreateApiKeyModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
      />
    </>
  );
}
