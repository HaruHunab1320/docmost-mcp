import { useMemo, useState } from "react";
import {
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";
import { queryClient } from "@/main";

interface AgentMemoryCaptureModalProps {
  workspaceId: string;
  spaceId?: string;
}

export function AgentMemoryCaptureModal({
  workspaceId,
  spaceId,
}: AgentMemoryCaptureModalProps) {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedTags = useMemo(
    () =>
      tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tags]
  );

  const handleSubmit = async () => {
    if (!content.trim() && !summary.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await agentMemoryService.ingest({
        workspaceId,
        spaceId,
        source: "manual",
        summary: summary.trim() || undefined,
        content: content.trim() ? { text: content.trim() } : undefined,
        tags: parsedTags.length ? parsedTags : undefined,
      });

      queryClient.invalidateQueries({ queryKey: ["memory-days"] });
      queryClient.invalidateQueries({ queryKey: ["memory-daily"] });

      notifications.show({
        title: t("Saved"),
        message: t("Memory added to your stream"),
        color: "green",
      });
      setSummary("");
      setContent("");
      setTags("");
      close();
    } catch (error) {
      notifications.show({
        title: t("Error"),
        message: t("Failed to save memory"),
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="light" onClick={open}>
        {t("Add memory")}
      </Button>
      <Modal opened={opened} onClose={close} title={t("Capture memory")}>
        <Divider size="xs" mb="xs" />
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            {t("Add a short summary or a full note. The agent can reference this later.")}
          </Text>
          <TextInput
            label={t("Summary")}
            placeholder={t("Quick headline")}
            value={summary}
            onChange={(event) => setSummary(event.currentTarget.value)}
          />
          <Textarea
            label={t("Details")}
            placeholder={t("What happened, what you learned, next steps...")}
            minRows={4}
            value={content}
            onChange={(event) => setContent(event.currentTarget.value)}
          />
          <TextInput
            label={t("Tags")}
            placeholder={t("Comma-separated tags")}
            value={tags}
            onChange={(event) => setTags(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              {t("Save memory")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
