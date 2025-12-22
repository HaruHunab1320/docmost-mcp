import { createPage } from "@/features/page/services/page-service";
import { searchPage } from "@/features/search/services/search-service";

function getWeekKey(date = new Date()) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const dayOffset = firstDay.getDay() || 7;
  const weekStart = new Date(firstDay);
  weekStart.setDate(firstDay.getDate() + (7 - dayOffset));
  const diff =
    date.getTime() -
    new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
      .getTime();
  const weekNumber = Math.ceil((diff / (1000 * 60 * 60 * 24) + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export function getWeeklyReviewTitle(date = new Date()) {
  return `Weekly Review ${getWeekKey(date)}`;
}

export async function getOrCreateWeeklyReviewPage(params: {
  spaceId: string;
}) {
  const title = getWeeklyReviewTitle();
  const matches = await searchPage({
    query: title,
    spaceId: params.spaceId,
  });
  const existing = matches.find((page) => page.title?.trim() === title);
  if (existing) {
    return existing;
  }

  const content = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Weekly Review Checklist" }],
      },
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Clear Inbox" }],
              },
            ],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Update next actions for projects" },
                ],
              },
            ],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Review waiting items" }],
              },
            ],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Review someday list" }],
              },
            ],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Scan calendar and deadlines" },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Notes" }],
      },
      {
        type: "paragraph",
        content: [],
      },
    ],
  };

  return createPage({
    title,
    spaceId: params.spaceId,
    content: JSON.stringify(content),
  });
}
