import React, { useState } from "react";
import {
  Table,
  Group,
  Text,
  Badge,
  ActionIcon,
  Box,
  Center,
  Stack,
  UnstyledButton,
} from "@mantine/core";
import {
  useAttachmentsQuery,
  useDeleteAttachmentMutation,
} from "../queries/attachment-query";
import Paginate from "@/components/common/paginate";
import { formatBytes } from "@/lib";
import { useTranslation } from "react-i18next";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { getFileUrl } from "@/lib/config";
import { modals } from "@mantine/modals";
import { useMediaQuery } from "@mantine/hooks";
import classes from "./attachment-list.module.css";

interface AttachmentListProps {
  spaceId?: string;
  pageId?: string;
  query?: string;
}

export default function AttachmentList({
  spaceId,
  pageId,
  query,
}: AttachmentListProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const deleteAttachmentMutation = useDeleteAttachmentMutation();
  const {
    data,
    isLoading,
    isError,
    error,
  } = useAttachmentsQuery({
    page,
    spaceId,
    pageId,
    query,
  });
  const items = data?.items ?? [];
  const meta = data?.meta;
  const isMobile = useMediaQuery("(max-width: 48em)");
  const errorMessage =
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    (error as Error | undefined)?.message ||
    t("Failed to load attachments");

  // Function to determine icon based on file extension
  const getFileTypeIcon = (fileExt: string) => {
    const iconMap: Record<string, string> = {
      pdf: "pdf",
      doc: "doc",
      docx: "doc",
      xls: "xls",
      xlsx: "xls",
      ppt: "ppt",
      pptx: "ppt",
      jpg: "image",
      jpeg: "image",
      png: "image",
      gif: "image",
      zip: "zip",
      rar: "zip",
      txt: "text",
    };

    const type = fileExt.toLowerCase().replace(".", "");
    return iconMap[type] || "file";
  };

  const isImageType = (fileExt: string, mimeType?: string) => {
    const ext = fileExt.toLowerCase();
    if (mimeType?.startsWith("image/")) return true;
    return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
  };

  // Function to format the date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Center>
        <Text>{t("Loading attachments...")}</Text>
      </Center>
    );
  }

  if (isError) {
    return (
      <Center>
        <Text>{errorMessage}</Text>
      </Center>
    );
  }

  if (items.length === 0) {
    return (
      <Center>
        <Text>{t("No attachments found")}</Text>
      </Center>
    );
  }

  const handleDelete = (attachmentId: string, fileName: string) => {
    modals.openConfirmModal({
      title: t("Delete attachment"),
      children: t("Are you sure you want to delete {{name}}?", {
        name: fileName,
      }),
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => deleteAttachmentMutation.mutate(attachmentId),
    });
  };

  const handleOpenAttachment = (attachment: (typeof items)[number]) => {
    const fileUrl = getFileUrl(
      `/files/${attachment.id}/${attachment.fileName}`
    );
    if (isImageType(attachment.fileExt, attachment.mimeType)) {
      modals.open({
        title: attachment.fileName,
        size: "lg",
        children: (
          <Box
            component="img"
            src={fileUrl}
            alt={attachment.fileName}
            style={{ width: "100%", height: "auto", borderRadius: 8 }}
          />
        ),
      });
      return;
    }
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {isMobile ? (
        <Stack gap="sm">
          {items.map((attachment) => (
            <div key={attachment.id} className={classes.mobileRow}>
              <UnstyledButton
                className={classes.mobileLink}
                onClick={() => handleOpenAttachment(attachment)}
              >
                <Group wrap="nowrap" gap="sm" align="flex-start">
                  {isImageType(attachment.fileExt, attachment.mimeType) ? (
                    <Box
                      component="img"
                      src={getFileUrl(
                        `/files/${attachment.id}/${attachment.fileName}`
                      )}
                      alt={attachment.fileName}
                      className={classes.mobileThumb}
                      onError={(event) => {
                        event.currentTarget.src = `/icons/filetypes/${getFileTypeIcon(attachment.fileExt)}.svg`;
                        event.currentTarget.style.objectFit = "contain";
                      }}
                    />
                  ) : (
                    <Box
                      component="img"
                      src={`/icons/filetypes/${getFileTypeIcon(attachment.fileExt)}.svg`}
                      alt={attachment.fileExt}
                      className={classes.mobileIcon}
                    />
                  )}
                  <div className={classes.mobileText}>
                    <Text size="sm" fw={600} lineClamp={1}>
                      {attachment.fileName}
                    </Text>
                    <Group gap={8} wrap="nowrap" className={classes.mobileMeta}>
                      <Text size="xs" c="dimmed">
                        {formatBytes(attachment.fileSize)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {attachment.fileExt.toUpperCase().replace(".", "")}
                      </Text>
                      <Text size="xs" c="dimmed" className={classes.mobileDate}>
                        {formatDate(attachment.createdAt)}
                      </Text>
                    </Group>
                  </div>
                </Group>
              </UnstyledButton>
              <Group gap="xs" className={classes.mobileActions}>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  component="a"
                  href={getFileUrl(
                    `/files/${attachment.id}/${attachment.fileName}`
                  )}
                  target="_blank"
                  download
                >
                  <IconDownload size={16} />
                </ActionIcon>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  loading={deleteAttachmentMutation.isPending}
                  onClick={() =>
                    handleDelete(attachment.id, attachment.fileName)
                  }
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </div>
          ))}
        </Stack>
      ) : (
        <Table.ScrollContainer minWidth={500}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("File Name")}</Table.Th>
                <Table.Th>{t("Size")}</Table.Th>
                <Table.Th>{t("Type")}</Table.Th>
                <Table.Th>{t("Uploaded")}</Table.Th>
                <Table.Th>{t("Actions")}</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {items.map((attachment) => (
                <Table.Tr key={attachment.id}>
                  <Table.Td>
                    <Group
                      gap="sm"
                      wrap="nowrap"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleOpenAttachment(attachment)}
                    >
                      {isImageType(attachment.fileExt, attachment.mimeType) ? (
                        <Box
                          component="img"
                          src={getFileUrl(
                            `/files/${attachment.id}/${attachment.fileName}`
                          )}
                          alt={attachment.fileName}
                          style={{
                            width: 28,
                            height: 28,
                            objectFit: "cover",
                            borderRadius: 4,
                          }}
                          onError={(event) => {
                            event.currentTarget.src = `/icons/filetypes/${getFileTypeIcon(attachment.fileExt)}.svg`;
                            event.currentTarget.style.objectFit = "contain";
                          }}
                        />
                      ) : (
                        <Box
                          component="img"
                          src={`/icons/filetypes/${getFileTypeIcon(attachment.fileExt)}.svg`}
                          alt={attachment.fileExt}
                          style={{ width: 20, height: 20 }}
                        />
                      )}
                      <Text size="sm" fw={500} lineClamp={1}>
                        {attachment.fileName}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatBytes(attachment.fileSize)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">
                      {attachment.fileExt.toUpperCase().replace(".", "")}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDate(attachment.createdAt)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        component="a"
                        href={getFileUrl(
                          `/files/${attachment.id}/${attachment.fileName}`
                        )}
                        target="_blank"
                        download
                      >
                        <IconDownload size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        size="sm" 
                        variant="subtle" 
                        color="red"
                        loading={deleteAttachmentMutation.isPending}
                        onClick={() =>
                          handleDelete(attachment.id, attachment.fileName)
                        }
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {items.length > 0 && meta && (
        <Paginate
          currentPage={page}
          hasPrevPage={meta.hasPrevPage}
          hasNextPage={meta.hasNextPage}
          onPageChange={setPage}
        />
      )}
    </>
  );
}
