"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Embed = void 0;
const core_1 = require("@tiptap/core");
const react_1 = require("@tiptap/react");
exports.Embed = core_1.Node.create({
    name: 'embed',
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
            provider: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-provider'),
                renderHTML: (attributes) => ({
                    'data-provider': attributes.provider,
                }),
            },
            align: {
                default: 'center',
                parseHTML: (element) => element.getAttribute('data-align'),
                renderHTML: (attributes) => ({
                    'data-align': attributes.align,
                }),
            },
            width: {
                default: 640,
                parseHTML: (element) => element.getAttribute('data-width'),
                renderHTML: (attributes) => ({
                    'data-width': attributes.width,
                }),
            },
            height: {
                default: 480,
                parseHTML: (element) => element.getAttribute('data-height'),
                renderHTML: (attributes) => ({
                    'data-height': attributes.height,
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
                    href: HTMLAttributes["data-src"],
                    target: "blank",
                },
                `${HTMLAttributes["data-src"]}`,
            ],
        ];
    },
    addCommands() {
        return {
            setEmbed: (attrs) => ({ commands }) => {
                return commands.insertContent({
                    type: 'embed',
                    attrs: attrs,
                });
            },
        };
    },
    addNodeView() {
        return (0, react_1.ReactNodeViewRenderer)(this.options.view);
    },
});
//# sourceMappingURL=embed.js.map