import { createPage } from "@/features/page/services/page-service";
import { searchPage } from "@/features/search/services/search-service";
import { getWeekKey, getWeekLabel } from "@/features/gtd/utils/review-schedule";
import { consumeWeeklyReviewPrompts } from "@/features/agent/services/agent-service";

export function getWeeklyReviewTitle(date = new Date()) {
  return `Weekly Review ${getWeekKey(date)}`;
}

export async function getOrCreateWeeklyReviewPage(params: {
  spaceId: string;
}) {
  const reviewDate = new Date();
  const title = getWeeklyReviewTitle(reviewDate);
  const matches = await searchPage({
    query: title,
    spaceId: params.spaceId,
  });
  const existing = matches.find((page) => page.title?.trim() === title);
  if (existing) {
    return existing;
  }

  const reviewPrompts = await consumeWeeklyReviewPrompts({
    spaceId: params.spaceId,
    weekKey: getWeekKey(reviewDate),
  }).catch(() => []);

  const promptList = reviewPrompts.length
    ? {
        type: "bulletList",
        content: reviewPrompts.map((prompt) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: prompt.question }],
            },
          ],
        })),
      }
    : {
        type: "paragraph",
        content: [
          { type: "text", text: "No agent questions this week." },
        ],
      };

  const content = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `Week of ${getWeekLabel(reviewDate)}`,
          },
        ],
      },
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
        content: [{ type: "text", text: "Weekly Summary" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Capture key wins, lessons, and what moved the needle.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Agent Questions" }],
      },
      promptList,
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Next Week Intentions" }],
      },
      {
        type: "paragraph",
        content: [],
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
