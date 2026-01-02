"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Excalidraw = void 0;
const core_1 = require("@tiptap/core");
const react_1 = require("@tiptap/react");
exports.Excalidraw = core_1.Node.create({
    name: 'excalidraw',
    inline: false,
    group: 'block',
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
            src: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-src'),
                renderHTML: (attributes) => ({
                    'data-src': attributes.src,
                }),
            },
            title: {
                default: undefined,
                parseHTML: (element) => element.getAttribute('data-title'),
                renderHTML: (attributes) => ({
                    'data-title': attributes.title,
                }),
            },
            width: {
                default: '100%',
                parseHTML: (element) => element.getAttribute('data-width'),
                renderHTML: (attributes) => ({
                    'data-width': attributes.width,
                }),
            },
            size: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-size'),
                renderHTML: (attributes) => ({
                    'data-size': attributes.size,
                }),
            },
            align: {
                default: 'center',
                parseHTML: (element) => element.getAttribute('data-align'),
                renderHTML: (attributes) => ({
                    'data-align': attributes.align,
                }),
            },
            attachmentId: {
                default: undefined,
                parseHTML: (element) => element.getAttribute('data-attachment-id'),
                renderHTML: (attributes) => ({
                    'data-attachment-id': attributes.attachmentId,
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
            'div',
            (0, core_1.mergeAttributes)({ 'data-type': this.name }, this.options.HTMLAttributes, HTMLAttributes),
            ['img', { src: HTMLAttributes['data-src'], alt: HTMLAttributes['data-title'], width: HTMLAttributes['data-width'] }],
        ];
    },
    addCommands() {
        return {
            setExcalidraw: (attrs) => ({ commands }) => {
                return commands.insertContent({
                    type: 'excalidraw',
                    attrs: attrs,
                });
            },
        };
    },
    addNodeView() {
        return (0, react_1.ReactNodeViewRenderer)(this.options.view);
    },
});
//# sourceMappingURL=excalidraw.js.map