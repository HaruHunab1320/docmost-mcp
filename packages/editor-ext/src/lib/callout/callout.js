"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Callout = exports.inputRegex = void 0;
const core_1 = require("@tiptap/core");
const state_1 = require("@tiptap/pm/state");
const react_1 = require("@tiptap/react");
const utils_1 = require("./utils");
exports.inputRegex = /^:::([a-z]+)?[\s\n]$/;
exports.Callout = core_1.Node.create({
    name: "callout",
    addOptions() {
        return {
            HTMLAttributes: {},
            view: null,
        };
    },
    content: "block+",
    group: "block",
    defining: true,
    addAttributes() {
        return {
            type: {
                default: "info",
                parseHTML: (element) => element.getAttribute("data-callout-type"),
                renderHTML: (attributes) => ({
                    "data-callout-type": attributes.type,
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
            0,
        ];
    },
    addCommands() {
        return {
            setCallout: (attributes) => ({ commands }) => {
                return commands.setNode(this.name, attributes);
            },
            unsetCallout: () => ({ commands }) => {
                return commands.lift(this.name);
            },
            toggleCallout: (attributes) => ({ commands }) => {
                return commands.toggleWrap(this.name, attributes);
            },
            updateCalloutType: (type) => ({ commands }) => commands.updateAttributes("callout", {
                type: (0, utils_1.getValidCalloutType)(type),
            }),
        };
    },
    addNodeView() {
        return (0, react_1.ReactNodeViewRenderer)(this.options.view);
    },
    addKeyboardShortcuts() {
        return {
            Backspace: ({ editor }) => {
                const { state, view } = editor;
                const { selection } = state;
                if (!selection.empty) {
                    return false;
                }
                const { $from } = selection;
                if ($from.parentOffset !== 0) {
                    return false;
                }
                const previousPosition = $from.before($from.depth) - 1;
                if (previousPosition < 1) {
                    return false;
                }
                const previousPos = state.doc.resolve(previousPosition);
                if (!previousPos?.parent) {
                    return false;
                }
                const previousNode = previousPos.parent;
                const parentNode = (0, core_1.findParentNode)(() => true)(selection);
                if (!parentNode) {
                    return false;
                }
                const { node, pos, depth } = parentNode;
                if (depth !== 1) {
                    return false;
                }
                if (node.type !== this.type && previousNode.type === this.type) {
                    const { content, nodeSize } = node;
                    const { tr } = state;
                    tr.delete(pos, pos + nodeSize);
                    tr.setSelection(state_1.TextSelection.near(tr.doc.resolve(previousPosition - 1)));
                    tr.insert(previousPosition - 1, content);
                    view.dispatch(tr);
                    return true;
                }
                return false;
            },
        };
    },
    addInputRules() {
        return [
            (0, core_1.wrappingInputRule)({
                find: exports.inputRegex,
                type: this.type,
                getAttributes: (match) => ({
                    type: (0, utils_1.getValidCalloutType)(match[1]),
                }),
            }),
        ];
    },
});
//# sourceMappingURL=callout.js.map