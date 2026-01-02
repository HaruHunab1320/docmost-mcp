"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAttachmentUpload = exports.AttachmentUploadPlugin = void 0;
const state_1 = require("@tiptap/pm/state");
const view_1 = require("@tiptap/pm/view");
const media_utils_1 = require("../media-utils");
const uploadKey = new state_1.PluginKey("attachment-upload");
const AttachmentUploadPlugin = ({ placeholderClass, }) => new state_1.Plugin({
    key: uploadKey,
    state: {
        init() {
            return view_1.DecorationSet.empty;
        },
        apply(tr, set) {
            set = set.map(tr.mapping, tr.doc);
            const action = tr.getMeta(uploadKey);
            if (action?.add) {
                const { id, pos, fileName } = action.add;
                const placeholder = document.createElement("div");
                placeholder.setAttribute("class", placeholderClass);
                const uploadingText = document.createElement("span");
                uploadingText.setAttribute("class", "uploading-text");
                uploadingText.textContent = `Uploading ${fileName}`;
                placeholder.appendChild(uploadingText);
                const realPos = pos + 1;
                const deco = view_1.Decoration.widget(realPos, placeholder, {
                    id,
                });
                set = set.add(tr.doc, [deco]);
            }
            else if (action?.remove) {
                set = set.remove(set.find(undefined, undefined, (spec) => spec.id == action.remove.id));
            }
            return set;
        },
    },
    props: {
        decorations(state) {
            return this.getState(state);
        },
    },
});
exports.AttachmentUploadPlugin = AttachmentUploadPlugin;
function findPlaceholder(state, id) {
    const decos = uploadKey.getState(state);
    const found = decos.find(undefined, undefined, (spec) => spec.id == id);
    return found.length ? found[0]?.from : null;
}
const handleAttachmentUpload = ({ validateFn, onUpload }) => async (file, view, pos, pageId, allowMedia) => {
    const validated = validateFn?.(file, allowMedia);
    if (!validated)
        return;
    const id = {};
    const tr = view.state.tr;
    if (!tr.selection.empty)
        tr.deleteSelection();
    tr.setMeta(uploadKey, {
        add: {
            id,
            pos,
            fileName: file.name,
        },
    });
    (0, media_utils_1.insertTrailingNode)(tr, pos, view);
    view.dispatch(tr);
    await onUpload(file, pageId).then((attachment) => {
        const { schema } = view.state;
        const pos = findPlaceholder(view.state, id);
        if (pos == null)
            return;
        if (!attachment)
            return;
        const node = schema.nodes.attachment?.create({
            url: `/api/files/${attachment.id}/${attachment.fileName}`,
            name: attachment.fileName,
            mime: attachment.mimeType,
            size: attachment.fileSize,
            attachmentId: attachment.id,
        });
        if (!node)
            return;
        const transaction = view.state.tr
            .replaceWith(pos, pos, node)
            .setMeta(uploadKey, { remove: { id } });
        view.dispatch(transaction);
    }, () => {
        const transaction = view.state.tr
            .delete(pos, pos)
            .setMeta(uploadKey, { remove: { id } });
        view.dispatch(transaction);
    });
};
exports.handleAttachmentUpload = handleAttachmentUpload;
//# sourceMappingURL=attachment-upload.js.map