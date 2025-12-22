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
}) {
  const title = getDailyNoteTitle();
  const matches = await searchPage({
    query: title,
    spaceId: params.spaceId,
  });
  const existing = matches.find((page) => page.title?.trim() === title);
  if (existing) {
    return existing;
  }

  return createPage({
    title,
    spaceId: params.spaceId,
  });
}
