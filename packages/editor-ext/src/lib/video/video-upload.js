"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleVideoUpload = exports.VideoUploadPlugin = void 0;
const state_1 = require("@tiptap/pm/state");
const view_1 = require("@tiptap/pm/view");
const media_utils_1 = require("../media-utils");
const uploadKey = new state_1.PluginKey("video-upload");
const VideoUploadPlugin = ({ placeholderClass, }) => new state_1.Plugin({
    key: uploadKey,
    state: {
        init() {
            return view_1.DecorationSet.empty;
        },
        apply(tr, set) {
            set = set.map(tr.mapping, tr.doc);
            const action = tr.getMeta(uploadKey);
            if (action?.add) {
                const { id, pos, src } = action.add;
                const placeholder = document.createElement("div");
                placeholder.setAttribute("class", "video-placeholder");
                const video = document.createElement("video");
                video.setAttribute("class", placeholderClass);
                video.src = src;
                placeholder.appendChild(video);
                const deco = view_1.Decoration.widget(pos + 1, placeholder, {
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
exports.VideoUploadPlugin = VideoUploadPlugin;
function findPlaceholder(state, id) {
    const decos = uploadKey.getState(state);
    const found = decos.find(undefined, undefined, (spec) => spec.id == id);
    return found.length ? found[0]?.from : null;
}
const handleVideoUpload = ({ validateFn, onUpload }) => async (file, view, pos, pageId) => {
    const validated = validateFn?.(file);
    if (!validated)
        return;
    const id = {};
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const tr = view.state.tr;
        if (!tr.selection.empty)
            tr.deleteSelection();
        tr.setMeta(uploadKey, {
            add: {
                id,
                pos,
                src: reader.result,
            },
        });
        (0, media_utils_1.insertTrailingNode)(tr, pos, view);
        view.dispatch(tr);
    };
    await onUpload(file, pageId).then((attachment) => {
        const { schema } = view.state;
        const pos = findPlaceholder(view.state, id);
        if (pos == null)
            return;
        if (!attachment)
            return;
        const node = schema.nodes.video?.create({
            src: `/api/files/${attachment.id}/${attachment.fileName}`,
            attachmentId: attachment.id,
            title: attachment.fileName,
            size: attachment.fileSize,
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
exports.handleVideoUpload = handleVideoUpload;
//# sourceMappingURL=video-upload.js.map