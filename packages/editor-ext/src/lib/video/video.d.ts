import { Range, Node } from "@tiptap/core";
export interface VideoOptions {
    view: any;
    HTMLAttributes: Record<string, any>;
}
export interface VideoAttributes {
    src?: string;
    title?: string;
    align?: string;
    attachmentId?: string;
    size?: number;
    width?: number;
}
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        videoBlock: {
            setVideo: (attributes: VideoAttributes) => ReturnType;
            setVideoAt: (attributes: VideoAttributes & {
                pos: number | Range;
            }) => ReturnType;
            setVideoAlign: (align: "left" | "center" | "right") => ReturnType;
            setVideoWidth: (width: number) => ReturnType;
        };
    }
}
export declare const TiptapVideo: Node<VideoOptions, any>;
