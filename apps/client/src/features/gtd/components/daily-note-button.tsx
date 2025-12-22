import { useState } from "react";
import { Button } from "@mantine/core";
import { IconNotebook } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { buildPageUrl } from "@/features/page/page.utils";
import { useSpaceQuery } from "@/features/space/queries/space-query";
import { getOrCreateDailyNote } from "@/features/gtd/utils/daily-note";

export function DailyNoteButton({ spaceId }: { spaceId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: space } = useSpaceQuery(spaceId);
  const [isWorking, setIsWorking] = useState(false);

  const handleClick = async () => {
    if (!space) return;
    setIsWorking(true);
    try {
      const dailyNote = await getOrCreateDailyNote({
        spaceId: space.id,
        spaceSlug: space.slug,
      });
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
