import { Node } from '@tiptap/pm/model';
import { jsonToNode } from '../../../collaboration/collaboration.util';

export interface MentionNode {
  id: string;
  label: string;
  entityType: 'user' | 'page';
  entityId: string;
  creatorId: string;
}

export function extractMentions(prosemirrorJson: any) {
  const mentionList: MentionNode[] = [];
  const doc = jsonToNode(prosemirrorJson);

  doc.descendants((node: Node) => {
    if (node.type.name === 'mention') {
      if (
        node.attrs.id &&
        !mentionList.some((mention) => mention.id === node.attrs.id)
      ) {
        mentionList.push({
          id: node.attrs.id,
          label: node.attrs.label,
          entityType: node.attrs.entityType,
          entityId: node.attrs.entityId,
          creatorId: node.attrs.creatorId,
        });
      }
    }
  });
  return mentionList;
}

export function extractUserMentions(mentionList: MentionNode[]): MentionNode[] {
  const userList = [];
  for (const mention of mentionList) {
    if (mention.entityType === 'user') {
      userList.push(mention);
    }
  }
  return userList as MentionNode[];
}

export function extractPageMentions(mentionList: MentionNode[]): MentionNode[] {
  const pageMentionList = [];
  for (const mention of mentionList) {
    if (
      mention.entityType === 'page' &&
      !pageMentionList.some(
        (pageMention) => pageMention.entityId === mention.entityId,
      )
    ) {
      pageMentionList.push(mention);
    }
  }
  return pageMentionList as MentionNode[];
}

export interface TaskItemNode {
  text: string;
  checked: boolean;
}

export function extractTaskItems(content: any): TaskItemNode[] {
  if (!content) return [];
  let json = content;
  if (typeof content === 'string') {
    try {
      json = JSON.parse(content);
    } catch {
      return [];
    }
  }

  try {
    const doc = jsonToNode(json);
    const items: TaskItemNode[] = [];
    const seen = new Set<string>();

    doc.descendants((node: Node) => {
      if (node.type.name === 'taskItem') {
        const text = node.textContent.trim();
        if (!text) return;
        const key = text.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        items.push({
          text,
          checked: Boolean(node.attrs?.checked),
        });
      }
    });

    return items;
  } catch {
    return [];
  }
}
