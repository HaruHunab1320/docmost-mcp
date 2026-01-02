import { ImageOptions as DefaultImageOptions } from "@tiptap/extension-image";
import { Range } from "@tiptap/core";
export interface ImageOptions extends DefaultImageOptions {
    view: any;
}
export interface ImageAttributes {
    src?: string;
    alt?: string;
    title?: string;
    align?: string;
    attachmentId?: string;
    size?: number;
    width?: number;
}
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        imageBlock: {
            setImage: (attributes: ImageAttributes) => ReturnType;
            setImageAt: (attributes: ImageAttributes & {
                pos: number | Range;
            }) => ReturnType;
            setImageAlign: (align: "left" | "center" | "right") => ReturnType;
            setImageWidth: (width: number) => ReturnType;
        };
    }
}
export declare const TiptapImage: import("@tiptap/react").Node<ImageOptions, any>;
