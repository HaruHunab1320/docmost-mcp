import { atom } from "jotai";

export interface AttachmentPreviewState {
  opened: boolean;
  url?: string;
  name?: string;
  isImage?: boolean;
}

export const attachmentPreviewAtom = atom<AttachmentPreviewState>({
  opened: false,
});
