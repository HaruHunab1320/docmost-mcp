import { Node } from "@tiptap/core";
export interface DrawioOptions {
    HTMLAttributes: Record<string, any>;
    view: any;
}
export interface DrawioAttributes {
    src?: string;
    title?: string;
    size?: number;
    width?: string;
    align?: string;
    attachmentId?: string;
}
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        drawio: {
            setDrawio: (attributes?: DrawioAttributes) => ReturnType;
        };
    }
}
export declare const Drawio: Node<DrawioOptions, any>;
