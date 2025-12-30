import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { ActionIcon, Box, Modal, Text } from "@mantine/core";
import { getFileUrl } from "@/lib/config.ts";
import { IconDownload, IconPaperclip } from "@tabler/icons-react";
import { useHover } from "@mantine/hooks";
import { formatBytes } from "@/lib";
import classes from "./attachment-view.module.css";
import { useState } from "react";

export default function AttachmentView(props: NodeViewProps) {
  const { node, selected } = props;
  const { url, name, size, mime } = node.attrs;
  const { hovered, ref } = useHover();
  const fileUrl = getFileUrl(url);
  const isImage =
    (typeof mime === "string" && mime.startsWith("image/")) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(name || "")) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(url || ""));
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <NodeViewWrapper as="span" className={classes.wrapper}>
      <Modal
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size="lg"
        centered
        title={name}
      >
        <img
          src={fileUrl}
          alt={name}
          style={{ width: "100%", height: "auto", borderRadius: 8 }}
        />
      </Modal>

      <Box
        ref={ref}
        data-drag-handle
        className={`${classes.chip} ${isImage ? classes.imageCard : ""} ${
          hovered || selected ? classes.chipHovered : ""
        }`}
        onClick={() => {
          if (isImage) {
            setPreviewOpen(true);
          } else {
            window.open(fileUrl, "_blank");
          }
        }}
        style={{ cursor: "pointer" }}
      >
        {isImage ? (
          <img
            src={fileUrl}
            alt={name}
            className={classes.thumbLarge}
            loading="lazy"
          />
        ) : (
          <IconPaperclip size={18} />
        )}

        <Box className={isImage ? classes.metaStack : classes.meta}>
          <Text component="span" className={classes.name}>
            {name}
          </Text>
          <Text component="span" className={classes.size}>
            {formatBytes(size)}
          </Text>
        </Box>

        <Box className={classes.actions}>
            <a href={fileUrl} target="_blank" onClick={(event) => event.stopPropagation()}>
              <ActionIcon variant="subtle" aria-label="download file">
                <IconDownload size={16} />
              </ActionIcon>
            </a>
          </Box>
      </Box>
    </NodeViewWrapper>
  );
}
