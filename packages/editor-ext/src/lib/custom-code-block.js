"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomCodeBlock = void 0;
const extension_code_block_lowlight_1 = require("@tiptap/extension-code-block-lowlight");
const react_1 = require("@tiptap/react");
const TAB_CHAR = "\u00A0\u00A0";
exports.CustomCodeBlock = extension_code_block_lowlight_1.default.extend({
    selectable: true,
    addOptions() {
        return {
            ...this.parent?.(),
            view: null,
        };
    },
    addKeyboardShortcuts() {
        return {
            ...this.parent?.(),
            Tab: () => {
                if (this.editor.isActive("codeBlock")) {
                    this.editor
                        .chain()
                        .command(({ tr }) => {
                        tr.insertText(TAB_CHAR);
                        return true;
                    })
                        .run();
                    return true;
                }
            },
        };
    },
    addNodeView() {
        return (0, react_1.ReactNodeViewRenderer)(this.options.view);
    },
});
//# sourceMappingURL=custom-code-block.js.map