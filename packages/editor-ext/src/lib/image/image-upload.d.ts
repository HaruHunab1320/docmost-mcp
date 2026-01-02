import { Plugin } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";
import { MediaUploadOptions, UploadFn } from "../media-utils";
export declare const ImageUploadPlugin: ({ placeholderClass, }: {
    placeholderClass: string;
}) => Plugin<DecorationSet>;
export declare const handleImageUpload: ({ validateFn, onUpload }: MediaUploadOptions) => UploadFn;
