import { Modal, Text, Anchor, Image } from "@mantine/core";
import { useAtom } from "jotai";
import { attachmentPreviewAtom } from "@/features/attachment/atoms/attachment-preview-atom";

export function AttachmentPreviewModal() {
  const [preview, setPreview] = useAtom(attachmentPreviewAtom);

  if (!preview.opened) return null;

  const handleClose = () => {
    setPreview({ opened: false });
  };

  return (
    <Modal
      opened
      onClose={handleClose}
      size="lg"
      centered
      title={preview.name || "Attachment"}
    >
      {preview.url ? (
        preview.isImage ? (
          <Image src={preview.url} alt={preview.name || "Attachment"} radius="md" />
        ) : (
          <Anchor href={preview.url} target="_blank">
            Open file
          </Anchor>
        )
      ) : (
        <Text size="sm" c="dimmed">
          File preview unavailable
        </Text>
      )}
    </Modal>
  );
}
