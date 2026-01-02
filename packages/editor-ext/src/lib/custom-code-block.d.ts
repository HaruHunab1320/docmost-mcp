import { CodeBlockLowlightOptions } from "@tiptap/extension-code-block-lowlight";
export interface CustomCodeBlockOptions extends CodeBlockLowlightOptions {
    view: any;
}
export declare const CustomCodeBlock: import("@tiptap/react").Node<CustomCodeBlockOptions, any>;
