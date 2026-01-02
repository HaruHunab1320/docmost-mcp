import { Editor } from "@tiptap/core";
import { Selection, Transaction } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { Node, ResolvedPos } from "@tiptap/pm/model";
export declare const isRectSelected: (rect: any) => (selection: CellSelection) => boolean;
export declare const findTable: (selection: Selection) => {
    pos: number;
    start: number;
    depth: number;
    node: import("prosemirror-model").Node;
};
export declare const isCellSelection: (selection: any) => selection is CellSelection;
export declare const isColumnSelected: (columnIndex: number) => (selection: any) => boolean;
export declare const isRowSelected: (rowIndex: number) => (selection: any) => boolean;
export declare const isTableSelected: (selection: any) => boolean;
export declare const getCellsInColumn: (columnIndex: number | number[]) => (selection: Selection) => {
    pos: number;
    start: number;
    node: Node | null | undefined;
}[];
export declare const getCellsInRow: (rowIndex: number | number[]) => (selection: Selection) => {
    pos: number;
    start: number;
    node: Node | null | undefined;
}[];
export declare const getCellsInTable: (selection: Selection) => {
    pos: number;
    start: number;
    node: Node;
}[];
export declare const findParentNodeClosestToPos: ($pos: ResolvedPos, predicate: (node: Node) => boolean) => {
    pos: number;
    start: number;
    depth: number;
    node: Node;
};
export declare const findCellClosestToPos: ($pos: ResolvedPos) => {
    pos: number;
    start: number;
    depth: number;
    node: Node;
};
export declare const selectColumn: (index: number) => (tr: Transaction) => Transaction;
export declare const selectRow: (index: number) => (tr: Transaction) => Transaction;
export declare const selectTable: (tr: Transaction) => Transaction;
export declare const isColumnGripSelected: ({ editor, view, state, from, }: {
    editor: Editor;
    view: EditorView;
    state: EditorState;
    from: number;
}) => boolean;
export declare const isRowGripSelected: ({ editor, view, state, from, }: {
    editor: Editor;
    view: EditorView;
    state: EditorState;
    from: number;
}) => boolean;
export declare function isTextSelected(editor: Editor): boolean;
export declare function setAttributes(editor: Editor, getPos: (() => number) | boolean, attrs: Record<string, any>): void;
export declare function icon(name: string): string;
