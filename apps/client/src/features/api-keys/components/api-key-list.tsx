import {
  Table,
  Text,
  Group,
  ActionIcon,
  Badge,
  Tooltip,
  Paper,
  ScrollArea,
} from "@mantine/core";
import { IconTrash, IconCopy } from "@tabler/icons-react";
import { useApiKeys, useRevokeApiKey } from "../queries/api-key-query";
import { MCPApiKey } from "../services/api-key-service";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function ApiKeyList() {
  const { t } = useTranslation();
  const { data, isLoading } = useApiKeys();
  const revokeApiKey = useRevokeApiKey();

  const handleRevoke = (apiKey: MCPApiKey) => {
    modals.openConfirmModal({
      title: t("Revoke API Key"),
      children: (
        <Text size="sm">
          {t("Are you sure you want to revoke the API key")} "{apiKey.name}"?{" "}
          {t("This action cannot be undone.")}
        </Text>
      ),
      labels: { confirm: t("Revoke"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        revokeApiKey.mutate(apiKey.id);
      },
    });
  };

  const copyKeyPrefix = (prefix: string) => {
    navigator.clipboard.writeText(prefix + "...");
    notifications.show({
      title: t("Copied"),
      message: t("Key prefix copied to clipboard"),
      color: "green",
    });
  };

  if (isLoading) {
    return <Text>{t("Loading...")}</Text>;
  }

  const apiKeys = data?.keys || [];

  if (apiKeys.length === 0) {
    return (
      <Paper p="lg" withBorder>
        <Text size="sm" c="dimmed" ta="center">
          {t("No API keys created yet")}
        </Text>
      </Paper>
    );
  }

  return (
    <ScrollArea>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("Name")}</Table.Th>
            <Table.Th>{t("Key Prefix")}</Table.Th>
            <Table.Th>{t("Last Used")}</Table.Th>
            <Table.Th>{t("Created")}</Table.Th>
            <Table.Th>{t("Actions")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {apiKeys.map((apiKey) => (
            <Table.Tr key={apiKey.id}>
              <Table.Td>
                <Text fw={500}>{apiKey.name}</Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Badge variant="light" size="sm">
                    {apiKey.keyPrefix}...
                  </Badge>
                  <Tooltip label={t("Copy prefix")}>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={() => copyKeyPrefix(apiKey.keyPrefix)}
                    >
                      <IconCopy size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {apiKey.lastUsedAt
                    ? dayjs(apiKey.lastUsedAt).fromNow()
                    : t("Never")}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {dayjs(apiKey.createdAt).fromNow()}
                </Text>
              </Table.Td>
              <Table.Td>
                <Tooltip label={t("Revoke API key")}>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => handleRevoke(apiKey)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}