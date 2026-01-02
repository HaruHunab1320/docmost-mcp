"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertTrailingNode = insertTrailingNode;
function insertTrailingNode(tr, pos, view) {
    const currentDocSize = view.state.doc.content.size;
    if (pos + 1 === currentDocSize) {
        tr.insert(currentDocSize, view.state.schema.nodes.paragraph.create());
    }
}
//# sourceMappingURL=media-utils.js.map