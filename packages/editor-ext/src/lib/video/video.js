"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiptapVideo = void 0;
const react_1 = require("@tiptap/react");
const video_upload_1 = require("./video-upload");
const core_1 = require("@tiptap/core");
exports.TiptapVideo = core_1.Node.create({
    name: "video",
    group: "block",
    isolating: true,
    atom: true,
    defining: true,
    draggable: true,
    addOptions() {
        return {
            view: null,
            HTMLAttributes: {},
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
            attachmentId: {
                default: undefined,
                parseHTML: (element) => element.getAttribute("data-attachment-id"),
                renderHTML: (attributes) => ({
                    "data-attachment-id": attributes.align,
                }),
            },
            width: {
                default: "100%",
                parseHTML: (element) => element.getAttribute("width"),
                renderHTML: (attributes) => ({
                    width: attributes.width,
                }),
            },
            size: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-size"),
                renderHTML: (attributes) => ({
                    "data-size": attributes.size,
                }),
            },
            align: {
                default: "center",
                parseHTML: (element) => element.getAttribute("data-align"),
                renderHTML: (attributes) => ({
                    "data-align": attributes.align,
                }),
            },
        };
    },
    renderHTML({ HTMLAttributes }) {
        return [
            "video",
            { controls: "true", ...HTMLAttributes },
            ["source", HTMLAttributes],
        ];
    },
    addCommands() {
        return {
            setVideo: (attrs) => ({ commands }) => {
                return commands.insertContent({
                    type: "video",
                    attrs: attrs,
                });
            },
            setVideoAlign: (align) => ({ commands }) => commands.updateAttributes("video", { align }),
            setVideoWidth: (width) => ({ commands }) => commands.updateAttributes("video", {
                width: `${Math.max(0, Math.min(100, width))}%`,
            }),
        };
    },
    addNodeView() {
        return (0, react_1.ReactNodeViewRenderer)(this.options.view);
    },
    addProseMirrorPlugins() {
        return [
            (0, video_upload_1.VideoUploadPlugin)({
                placeholderClass: "video-upload",
            }),
        ];
    },
});
//# sourceMappingURL=video.js.map