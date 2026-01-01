import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { ActionIcon, Box, Text } from "@mantine/core";
import { getFileUrl } from "@/lib/config.ts";
import { IconDownload, IconPaperclip } from "@tabler/icons-react";
import { formatBytes } from "@/lib";
import classes from "./attachment-view.module.css";
import { useSetAtom } from "jotai";
import { attachmentPreviewAtom } from "@/features/attachment/atoms/attachment-preview-atom";

export default function AttachmentView(props: NodeViewProps) {
  const { node, selected } = props;
  const {
    url,
    name,
    size,
    mime,
    filePath,
    fileName,
    fileSize,
    mimeType,
    attachmentId,
    id,
  } = node.attrs;
  const resolvedName = name || fileName || "Attachment";
  const resolvedSize = size ?? fileSize ?? 0;
  const resolvedMime = mime || mimeType || "";
  const extractIdFromUrl = (raw: string) => {
    const match = raw.match(/\/files\/([^/]+)/);
    return match?.[1] || "";
  };
  const attachmentKey =
    attachmentId || id || extractIdFromUrl(String(url || "")) || "";
  const derivePathFromFilePath = (rawPath?: string) => {
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
  };
  const fallbackPath =
    derivePathFromFilePath(filePath) ||
    (attachmentKey && resolvedName
      ? `/files/${attachmentKey}/${encodeURIComponent(resolvedName)}`
      : "");
  const urlString = typeof url === "string" ? url : "";
  const decodeSafely = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  const encodeLastPathSegment = (path: string) => {
    const parts = path.split("/");
    const last = parts.pop();
    if (!last) return path;
    parts.push(encodeURIComponent(decodeSafely(last)));
    return parts.join("/");
  };
  const normalizeUrl = (raw: string) => {
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
  };
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
  const fileUrl = getFileUrl(
    directPath || (urlLooksInvalid ? fallbackPath : normalizedUrl),
  );
  const isImage =
    (typeof resolvedMime === "string" && resolvedMime.startsWith("image/")) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(resolvedName || "")) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(fileUrl || ""));
  const setPreview = useSetAtom(attachmentPreviewAtom);

  return (
    <NodeViewWrapper as="span" className={classes.wrapper}>
      <Box
        data-drag-handle
        data-selected={selected ? "true" : "false"}
        className={`${classes.chip} ${isImage ? classes.imageCard : ""}`}
        onClick={() => {
          if (!fileUrl) return;
          if (isImage) {
            setPreview({
              opened: true,
              url: fileUrl,
              name: resolvedName,
              isImage: true,
            });
          } else {
            window.open(fileUrl, "_blank");
          }
        }}
        style={{ cursor: "pointer" }}
      >
        {isImage && fileUrl ? (
          <img
            src={fileUrl}
            alt={resolvedName}
            className={classes.thumbLarge}
            loading="lazy"
          />
        ) : (
          <IconPaperclip size={18} />
        )}

        <Box className={isImage ? classes.metaStack : classes.meta}>
          <Text component="span" className={classes.name}>
            {resolvedName}
          </Text>
          <Text component="span" className={classes.size}>
            {formatBytes(resolvedSize)}
          </Text>
        </Box>

        <Box className={classes.actions}>
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              onClick={(event) => event.stopPropagation()}
            >
              <ActionIcon variant="subtle" aria-label="download file">
                <IconDownload size={16} />
              </ActionIcon>
            </a>
          )}
        </Box>
      </Box>
    </NodeViewWrapper>
  );
}
