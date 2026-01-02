"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkExtension = void 0;
const core_1 = require("@tiptap/core");
const extension_link_1 = require("@tiptap/extension-link");
const state_1 = require("@tiptap/pm/state");
exports.LinkExtension = extension_link_1.default.extend({
    inclusive: false,
    parseHTML() {
        return [
            {
                tag: 'a[href]:not([data-type="button"]):not([href *= "javascript:" i])',
                getAttrs: (element) => {
                    if (element
                        .getAttribute("href")
                        ?.toLowerCase()
                        .startsWith("javascript:")) {
                        return false;
                    }
                    return null;
                },
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        if (HTMLAttributes.href?.toLowerCase().startsWith("javascript:")) {
            return [
                "a",
                (0, core_1.mergeAttributes)(this.options.HTMLAttributes, { ...HTMLAttributes, href: "" }, { class: "link" }),
                0,
            ];
        }
        return [
            "a",
            (0, core_1.mergeAttributes)(this.options.HTMLAttributes, HTMLAttributes, {
                class: "link",
            }),
            0,
        ];
    },
    addProseMirrorPlugins() {
        const { editor } = this;
        return [
            ...(this.parent?.() || []),
            new state_1.Plugin({
                props: {
                    handleKeyDown: (view, event) => {
                        const { selection } = editor.state;
                        if (event.key === "Escape" && selection.empty !== true) {
                            editor.commands.focus(selection.to, { scrollIntoView: false });
                        }
                        return false;
                    },
                },
            }),
        ];
    },
});
//# sourceMappingURL=link.js.map