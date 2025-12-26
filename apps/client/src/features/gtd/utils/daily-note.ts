import { createPage } from "@/features/page/services/page-service";
import { searchPage } from "@/features/search/services/search-service";

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDailyNoteTitle(date = new Date()) {
  return `${formatDate(date)} Daily Note`;
}

export async function getOrCreateDailyNote(params: {
  spaceId: string;
  spaceSlug: string;
}): Promise<{ page: any; created: boolean }> {
  const title = getDailyNoteTitle();
  const matches = await searchPage({
    query: title,
    spaceId: params.spaceId,
  });
  const existing = matches.find((page) => page.title?.trim() === title);
  if (existing) {
    return { page: existing, created: false };
  }

  const created = await createPage({
    title,
    spaceId: params.spaceId,
  });
  return { page: created, created: true };
}
