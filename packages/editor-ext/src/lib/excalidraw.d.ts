import { Node } from '@tiptap/core';
export interface ExcalidrawOptions {
    HTMLAttributes: Record<string, any>;
    view: any;
}
export interface ExcalidrawAttributes {
    src?: string;
    title?: string;
    size?: number;
    width?: string;
    align?: string;
    attachmentId?: string;
}
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        excalidraw: {
            setExcalidraw: (attributes?: ExcalidrawAttributes) => ReturnType;
        };
    }
}
export declare const Excalidraw: Node<ExcalidrawOptions, any>;
