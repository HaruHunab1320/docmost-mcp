"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attachment = void 0;
const core_1 = require("@tiptap/core");
const react_1 = require("@tiptap/react");
const attachment_upload_1 = require("./attachment-upload");
exports.Attachment = core_1.Node.create({
    name: "attachment",
    inline: false,
    group: "block",
    isolating: true,
    atom: true,
    defining: true,
    draggable: true,
    addOptions() {
        return {
            HTMLAttributes: {},
            view: null,
        };
    },
    addAttributes() {
        return {
            url: {
                default: "",
                parseHTML: (element) => element.getAttribute("data-attachment-url"),
                renderHTML: (attributes) => ({
                    "data-attachment-url": attributes.url,
                }),
            },
            name: {
                default: undefined,
                parseHTML: (element) => element.getAttribute("data-attachment-name"),
                renderHTML: (attributes) => ({
                    "data-attachment-name": attributes.name,
                }),
            },
            mime: {
                default: undefined,
                parseHTML: (element) => element.getAttribute("data-attachment-mime"),
                renderHTML: (attributes) => ({
                    "data-attachment-mime": attributes.mime,
                }),
            },
            size: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-attachment-size"),
                renderHTML: (attributes) => ({
                    "data-attachment-size": attributes.size,
                }),
            },
            attachmentId: {
                default: undefined,
                parseHTML: (element) => element.getAttribute("data-attachment-id"),
                renderHTML: (attributes) => ({
                    "data-attachment-id": attributes.attachmentId,
                }),
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: `div[data-type="${this.name}"]`,
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return [
            "div",
            (0, core_1.mergeAttributes)({ "data-type": this.name }, this.options.HTMLAttributes, HTMLAttributes),
            [
                "a",
                {
                    href: HTMLAttributes["data-attachment-url"],
                    class: "attachment",
                    target: "blank",
                },
                `${HTMLAttributes["data-attachment-name"]}`,
            ],
        ];
    },
    addCommands() {
        return {
            setAttachment: (attrs) => ({ commands }) => {
                return commands.insertContent({
                    type: "attachment",
                    attrs: attrs,
                });
            },
        };
    },
    addNodeView() {
        return (0, react_1.ReactNodeViewRenderer)(this.options.view);
    },
    addProseMirrorPlugins() {
        return [
            (0, attachment_upload_1.AttachmentUploadPlugin)({
                placeholderClass: "attachment-placeholder",
            }),
        ];
    },
});
//# sourceMappingURL=attachment.js.map