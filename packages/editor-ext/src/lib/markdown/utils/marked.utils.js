"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownToHtml = markdownToHtml;
const marked_1 = require("marked");
const callout_marked_1 = require("./callout.marked");
const math_block_marked_1 = require("./math-block.marked");
const math_inline_marked_1 = require("./math-inline.marked");
marked_1.marked.use({
    renderer: {
        list(body, isOrdered, start) {
            if (isOrdered) {
                const startAttr = start !== 1 ? ` start="${start}"` : "";
                return `<ol ${startAttr}>\n${body}</ol>\n`;
            }
            const dataType = body.includes(`<input`) ? ' data-type="taskList"' : "";
            return `<ul${dataType}>\n${body}</ul>\n`;
        },
        listitem({ text, raw, task: isTask, checked: isChecked }) {
            if (!isTask) {
                return `<li>${text}</li>\n`;
            }
            const checkedAttr = isChecked
                ? 'data-checked="true"'
                : 'data-checked="false"';
            return `<li data-type="taskItem" ${checkedAttr}>${text}</li>\n`;
        },
    },
});
marked_1.marked.use({
    extensions: [callout_marked_1.calloutExtension, math_block_marked_1.mathBlockExtension, math_inline_marked_1.mathInlineExtension],
});
function markdownToHtml(markdownInput) {
    const YAML_FONT_MATTER_REGEX = /^\s*---[\s\S]*?---\s*/;
    const markdown = markdownInput
        .replace(YAML_FONT_MATTER_REGEX, "")
        .trimStart();
    return marked_1.marked
        .options({ breaks: true })
        .parse(markdown)
        .toString();
}
//# sourceMappingURL=marked.utils.js.map