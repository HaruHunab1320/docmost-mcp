import { useState } from "react";
import { Box, Button, Group, Stack, Text, Textarea } from "@mantine/core";
import { IconSend, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { projectService } from "@/features/project/services/project-service";
import { queryClient } from "@/main";
import { useSpaceQuery } from "@/features/space/queries/space-query";
import { getOrCreateDailyNote } from "@/features/gtd/utils/daily-note";
import { buildPageUrl } from "@/features/page/page.utils";
import { parseBucketedInput } from "@/features/gtd/utils/auto-bucket";
import { setTaskBucket } from "@/features/gtd/utils/task-buckets";

interface JournalCaptureProps {
  spaceId: string;
}

export function JournalCapture({ spaceId }: JournalCaptureProps) {
  const { t } = useTranslation();
  const { data: space } = useSpaceQuery(spaceId);
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const lines = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return;

    setIsSubmitting(true);
    try {
      if (!space) {
        throw new Error("Missing space");
      }

      const dailyNote = await getOrCreateDailyNote({
        spaceId: space.id,
        spaceSlug: space.slug,
      });
      const noteUrl = buildPageUrl(
        space.slug,
        dailyNote.slugId,
        dailyNote.title
      );

      for (const line of lines) {
        const parsed = parseBucketedInput(line);
        if (!parsed.title) continue;
        const created = await projectService.createTask({
          title: parsed.title,
          spaceId,
          description: `Captured in Daily Note: [${dailyNote.title}](${noteUrl})`,
        });
        if (parsed.bucket && created?.id) {
          setTaskBucket(spaceId, created.id, parsed.bucket);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["space-tasks"] });
      notifications.show({
        title: t("Captured"),
        message: t("Added {{count}} items to Inbox", {
          count: lines.length,
        }),
        color: "green",
      });
      setValue("");
    } catch (error) {
      notifications.show({
        title: t("Error"),
        message: t("Failed to capture items"),
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack gap="xs">
      <Textarea
        minRows={4}
        placeholder={t("Journal ideas, tasks, notes... one per line")}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
      />
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {t("Each line becomes an Inbox item")}
        </Text>
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconTrash size={14} />}
            onClick={() => setValue("")}
            disabled={!value.trim()}
          >
            {t("Clear")}
          </Button>
          <Button
            leftSection={<IconSend size={14} />}
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!value.trim()}
          >
            {t("Capture to Inbox")}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
