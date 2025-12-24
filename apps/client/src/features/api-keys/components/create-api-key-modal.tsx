import {
  Modal,
  TextInput,
  Button,
  Stack,
  Text,
  Alert,
  Code,
  Group,
  CopyButton,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconInfoCircle, IconCopy, IconCheck } from "@tabler/icons-react";
import { useCreateApiKey } from "../queries/api-key-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface CreateApiKeyModalProps {
  opened: boolean;
  onClose: () => void;
}

export function CreateApiKeyModal({ opened, onClose }: CreateApiKeyModalProps) {
  const { t } = useTranslation();
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const createApiKey = useCreateApiKey();

  const form = useForm({
    initialValues: {
      name: "",
    },
    validate: {
      name: (value) => {
        if (!value || value.length < 3) {
          return t("Name must be at least 3 characters");
        }
        if (value.length > 50) {
          return t("Name must be less than 50 characters");
        }
        return null;
      },
    },
  });

  const handleSubmit = async (values: { name: string }) => {
    try {
      const result = await createApiKey.mutateAsync(values);
      setCreatedKey(result.key);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setCreatedKey(null);
    form.reset();
    onClose();
  };

  if (createdKey) {
    return (
      <Modal
        opened={opened}
        onClose={handleClose}
        title={t("API Key Created Successfully")}
        size="lg"
      >
        <Stack>
          <Alert
            icon={<IconInfoCircle />}
            color="yellow"
            title={t("Important")}
          >
            <Text size="sm">
              {t(
                "This is the only time you will see this API key. Please copy it now and store it securely."
              )}
            </Text>
          </Alert>

          <Group>
            <Code style={{ flex: 1 }} p="md">
              {createdKey}
            </Code>
            <CopyButton value={createdKey} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip
                  label={copied ? t("Copied") : t("Copy")}
                  withArrow
                  position="right"
                >
                  <ActionIcon
                    color={copied ? "teal" : "gray"}
                    onClick={copy}
                    size="lg"
                  >
                    {copied ? <IconCheck size={20} /> : <IconCopy size={20} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>

          <Text size="sm" c="dimmed">
            {t("Use this API key to authenticate MCP requests:")}
          </Text>

          <Code block>
            {`curl -X POST ${window.location.origin}/api/mcp \\
  -H "Authorization: Bearer ${createdKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "page.list",
    "params": {},
    "id": 1
  }'`}
          </Code>

          <Button fullWidth onClick={handleClose}>
            {t("Done")}
          </Button>
        </Stack>
      </Modal>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("Create API Key")}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label={t("Name")}
            placeholder={t("e.g., Production API Key")}
            required
            {...form.getInputProps("name")}
            description={t(
              "Choose a descriptive name to help you identify this key later"
            )}
          />

          <Text size="sm" c="dimmed">
            {t(
              "API keys allow external applications to access Raven Docs via the Machine Control Protocol (MCP)."
            )}
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={createApiKey.isPending}>
              {t("Create API Key")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
