import type { EditorView } from "@tiptap/pm/view";
import { Transaction } from "@tiptap/pm/state";
export type UploadFn = (file: File, view: EditorView, pos: number, pageId: string, allowMedia?: boolean) => void;
export interface MediaUploadOptions {
    validateFn?: (file: File, allowMedia?: boolean) => void;
    onUpload: (file: File, pageId: string) => Promise<any>;
}
export declare function insertTrailingNode(tr: Transaction, pos: number, view: EditorView): void;
