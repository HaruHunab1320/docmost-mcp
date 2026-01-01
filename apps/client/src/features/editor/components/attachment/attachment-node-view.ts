import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { NodeView, EditorView } from "prosemirror-view";
import { getDefaultStore } from "jotai";
import { getFileUrl } from "@/lib/config";
import { formatBytes } from "@/lib";
import { attachmentPreviewAtom } from "@/features/attachment/atoms/attachment-preview-atom";
import classes from "./attachment-view.module.css";

const store = getDefaultStore();

const iconPaperclip =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';

const iconDownload =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

function encodeLastPathSegment(path: string) {
  const parts = path.split("/");
  const last = parts.pop();
  if (!last) return path;
  parts.push(encodeURIComponent(decodeSafely(last)));
  return parts.join("/");
}

function decodeSafely(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeUrl(raw: string) {
  if (!raw) return raw;
  if (raw.startsWith("http")) {
    try {
      const parsed = new URL(raw);
      parsed.pathname = encodeLastPathSegment(parsed.pathname);
      return parsed.toString();
    } catch {
      return raw;
    }
  }
  if (raw.startsWith("/api/") || raw.startsWith("/files/")) {
    return encodeLastPathSegment(raw);
  }
  return raw;
}

function derivePathFromFilePath(rawPath?: string) {
  if (!rawPath) return "";
  const normalized = rawPath.replace(/\\/g, "/");
  const filesIndex = normalized.lastIndexOf("/files/");
  if (filesIndex !== -1) {
    const tail = normalized.slice(filesIndex + "/files/".length);
    const [idPart, ...nameParts] = tail.split("/");
    if (idPart && nameParts.length) {
      const fileName = encodeURIComponent(nameParts.join("/"));
      return `/files/${idPart}/${fileName}`;
    }
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const idPart = segments[segments.length - 2];
    const namePart = segments[segments.length - 1];
    if (idPart && namePart) {
      return `/files/${idPart}/${encodeURIComponent(namePart)}`;
    }
  }
  return "";
}

function extractIdFromUrl(raw: string) {
  const match = raw.match(/\/files\/([^/]+)/);
  return match?.[1] || "";
}

function buildFileUrl(attrs: Record<string, any>) {
  const {
    url,
    name,
    fileName,
    filePath,
    attachmentId,
    id,
  } = attrs;
  const resolvedName = name || fileName || "Attachment";
  const attachmentKey =
    attachmentId || id || extractIdFromUrl(String(url || "")) || "";
  const fallbackPath =
    derivePathFromFilePath(filePath) ||
    (attachmentKey && resolvedName
      ? `/files/${attachmentKey}/${encodeURIComponent(resolvedName)}`
      : "");
  const urlString = typeof url === "string" ? url : "";
  const urlLooksInvalid =
    !urlString ||
    urlString.includes("undefined") ||
    urlString.includes("null") ||
    urlString.endsWith("/undefined") ||
    urlString.endsWith("/null");
  const normalizedUrl = normalizeUrl(urlString);
  const safeName = resolvedName || "attachment";
  const directPath =
    attachmentKey && safeName
      ? `/files/${attachmentKey}/${encodeURIComponent(safeName)}`
      : "";
  return getFileUrl(
    directPath || (urlLooksInvalid ? fallbackPath : normalizedUrl),
  );
}

function isImageFile(attrs: Record<string, any>, fileUrl: string) {
  const resolvedName = attrs.name || attrs.fileName || "";
  const resolvedMime = attrs.mime || attrs.mimeType || "";
  return (
    (typeof resolvedMime === "string" && resolvedMime.startsWith("image/")) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(resolvedName || "")) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(fileUrl || ""))
  );
}

class AttachmentNodeView implements NodeView {
  node: ProseMirrorNode;
  dom: HTMLElement;
  view: EditorView;
  chip: HTMLDivElement;
  preview: HTMLImageElement | null = null;
  nameEl: HTMLSpanElement;
  sizeEl: HTMLSpanElement;
  actionsEl: HTMLDivElement;

  constructor(node: ProseMirrorNode, view: EditorView) {
    this.node = node;
    this.view = view;
    this.dom = document.createElement("span");
    this.dom.className = classes.wrapper;

    this.chip = document.createElement("div");
    this.chip.className = classes.chip;
    this.chip.setAttribute("data-drag-handle", "true");
    this.dom.appendChild(this.chip);

    this.nameEl = document.createElement("span");
    this.nameEl.className = classes.name;
    this.sizeEl = document.createElement("span");
    this.sizeEl.className = classes.size;

    this.actionsEl = document.createElement("div");
    this.actionsEl.className = classes.actions;

    this.render(node);
  }

  render(node: ProseMirrorNode) {
    const attrs = node.attrs || {};
    const resolvedName = attrs.name || attrs.fileName || "Attachment";
    const resolvedSize = attrs.size ?? attrs.fileSize ?? 0;
    const fileUrl = buildFileUrl(attrs);
    const image = isImageFile(attrs, fileUrl);

    this.chip.className = `${classes.chip} ${image ? classes.imageCard : ""}`.trim();
    this.chip.innerHTML = "";

    if (image && fileUrl) {
      this.preview = document.createElement("img");
      this.preview.src = fileUrl;
      this.preview.alt = resolvedName;
      this.preview.loading = "lazy";
      this.preview.className = classes.thumbLarge;
      this.chip.appendChild(this.preview);
    } else {
      const icon = document.createElement("span");
      icon.innerHTML = iconPaperclip;
      this.chip.appendChild(icon);
    }

    const meta = document.createElement("div");
    meta.className = image ? classes.metaStack : classes.meta;
    this.nameEl.textContent = resolvedName;
    this.sizeEl.textContent = formatBytes(resolvedSize);
    meta.appendChild(this.nameEl);
    meta.appendChild(this.sizeEl);
    this.chip.appendChild(meta);

    this.actionsEl.innerHTML = "";
    if (fileUrl) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.target = "_blank";
      link.innerHTML = iconDownload;
      link.addEventListener("click", (event) => event.stopPropagation());
      this.actionsEl.appendChild(link);
    }
    this.chip.appendChild(this.actionsEl);

    this.chip.onclick = () => {
      if (!fileUrl) return;
      if (image) {
        store.set(attachmentPreviewAtom, {
          opened: true,
          url: fileUrl,
          name: resolvedName,
          isImage: true,
        });
      } else {
        window.open(fileUrl, "_blank");
      }
    };
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.render(node);
    return true;
  }

  selectNode() {
    this.chip.setAttribute("data-selected", "true");
  }

  deselectNode() {
    this.chip.removeAttribute("data-selected");
  }
}

export function attachmentNodeViewRenderer() {
  return (props: { node: ProseMirrorNode; view: EditorView }) =>
    new AttachmentNodeView(props.node, props.view);
}
