"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiptapImage = void 0;
const extension_image_1 = require("@tiptap/extension-image");
const react_1 = require("@tiptap/react");
const image_upload_1 = require("./image-upload");
const core_1 = require("@tiptap/core");
exports.TiptapImage = extension_image_1.default.extend({
    name: "image",
    inline: false,
    group: "block",
    isolating: true,
    atom: true,
    defining: true,
    addOptions() {
        return {
            ...this.parent?.(),
            view: null,
        };
    },
    addAttributes() {
        return {
            src: {
                default: "",
                parseHTML: (element) => element.getAttribute("src"),
                renderHTML: (attributes) => ({
                    src: attributes.src,
                }),
            },
            width: {
                default: "100%",
                parseHTML: (element) => element.getAttribute("width"),
                renderHTML: (attributes) => ({
                    width: attributes.width,
                }),
            },
            align: {
                default: "center",
                parseHTML: (element) => element.getAttribute("data-align"),
                renderHTML: (attributes) => ({
                    "data-align": attributes.align,
                }),
            },
            alt: {
                default: undefined,
                parseHTML: (element) => element.getAttribute("alt"),
                renderHTML: (attributes) => ({
                    alt: attributes.alt,
                }),
            },
            attachmentId: {
                default: undefined,
                parseHTML: (element) => element.getAttribute("data-attachment-id"),
                renderHTML: (attributes) => ({
                    "data-attachment-id": attributes.align,
                }),
            },
            size: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-size"),
                renderHTML: (attributes) => ({
                    "data-size": attributes.size,
                }),
            },
        };
    },
    renderHTML({ HTMLAttributes }) {
        return [
            "img",
            (0, core_1.mergeAttributes)(this.options.HTMLAttributes, HTMLAttributes),
        ];
    },
    addCommands() {
        return {
            setImage: (attrs) => ({ commands }) => {
                return commands.insertContent({
                    type: "image",
                    attrs: attrs,
                });
            },
            setImageAt: (attrs) => ({ commands }) => {
                return commands.insertContentAt(attrs.pos, {
                    type: "image",
                    attrs: attrs,
                });
            },
            setImageAlign: (align) => ({ commands }) => commands.updateAttributes("image", { align }),
            setImageWidth: (width) => ({ commands }) => commands.updateAttributes("image", {
                width: `${Math.max(0, Math.min(100, width))}%`,
            }),
        };
    },
    addNodeView() {
        return (0, react_1.ReactNodeViewRenderer)(this.options.view);
    },
    addProseMirrorPlugins() {
        return [
            (0, image_upload_1.ImageUploadPlugin)({
                placeholderClass: "image-upload",
            }),
        ];
    },
});
//# sourceMappingURL=image.js.map