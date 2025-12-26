import { useState } from "react";
import { Button } from "@mantine/core";
import { IconNotebook } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { buildPageUrl } from "@/features/page/page.utils";
import { useSpaceQuery } from "@/features/space/queries/space-query";
import { getOrCreateDailyNote } from "@/features/gtd/utils/daily-note";
import { useAtom } from "jotai";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";

export function DailyNoteButton({ spaceId }: { spaceId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: space } = useSpaceQuery(spaceId);
  const [workspace] = useAtom(workspaceAtom);
  const [isWorking, setIsWorking] = useState(false);
  const allowMemoryIngest =
    workspace?.settings?.agent?.enableMemoryAutoIngest !== false;

  const handleClick = async () => {
    if (!space) return;
    setIsWorking(true);
    try {
      const { page: dailyNote, created } = await getOrCreateDailyNote({
        spaceId: space.id,
        spaceSlug: space.slug,
      });
      if (created && workspace?.id && allowMemoryIngest) {
        try {
          const noteUrl = buildPageUrl(
            space.slug,
            dailyNote.slugId,
            dailyNote.title
          );
          await agentMemoryService.ingest({
            workspaceId: workspace.id,
            spaceId: space.id,
            source: "daily-note",
            summary: `Created daily note: ${dailyNote.title}`,
            content: {
              text: `New daily note created: [${dailyNote.title}](${noteUrl})`,
            },
            tags: ["daily-note"],
          });
        } catch {
          // Memory ingestion should not block navigation.
        }
      }
      navigate(
        buildPageUrl(space.slug, dailyNote.slugId, dailyNote.title)
      );
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Button
      variant="light"
      leftSection={<IconNotebook size={16} />}
      onClick={handleClick}
      loading={isWorking}
      disabled={!space}
    >
      {t("Daily note")}
    </Button>
  );
}
