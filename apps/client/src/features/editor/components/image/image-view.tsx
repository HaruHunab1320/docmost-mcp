import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useMemo } from "react";
import { Image } from "@mantine/core";
import { getFileUrl } from "@/lib/config.ts";
import clsx from "clsx";

export default function ImageView(props: NodeViewProps) {
  const { node, selected } = props;
  const { src, width, align, title, attachmentId } = node.attrs;

  const alignClass = useMemo(() => {
    if (align === "left") return "alignLeft";
    if (align === "right") return "alignRight";
    if (align === "center") return "alignCenter";
    return "alignCenter";
  }, [align]);

  const srcString = typeof src === "string" ? src : "";
  const srcLooksInvalid =
    !srcString ||
    srcString.includes("undefined") ||
    srcString.includes("null") ||
    srcString.endsWith("/undefined") ||
    srcString.endsWith("/null");
  const fallbackSrc =
    attachmentId && title
      ? `/files/${attachmentId}/${encodeURIComponent(title)}`
      : "";
  const resolvedSrc = getFileUrl(srcLooksInvalid ? fallbackSrc : srcString);

  return (
    <NodeViewWrapper>
      <Image
        radius="md"
        fit="contain"
        w={width}
        src={resolvedSrc}
        alt={title}
        className={clsx(selected ? "ProseMirror-selectednode" : "", alignClass)}
      />
    </NodeViewWrapper>
  );
}
