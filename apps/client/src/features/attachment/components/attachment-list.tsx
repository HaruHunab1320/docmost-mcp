import React, { useState } from "react";
import {
  Table,
  Group,
  Text,
  Badge,
  ActionIcon,
  Box,
  Center,
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
  const { data, isLoading } = useAttachmentsQuery({
    page,
    spaceId,
    pageId,
    query,
  });

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

  if (!data || data.items.length === 0) {
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

  return (
    <>
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
            {data.items.map((attachment) => (
              <Table.Tr key={attachment.id}>
                <Table.Td>
                  <Group gap="sm" wrap="nowrap">
                    <Box
                      component="img"
                      src={`/icons/filetypes/${getFileTypeIcon(attachment.fileExt)}.svg`}
                      alt={attachment.fileExt}
                      style={{ width: 20, height: 20 }}
                    />
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

      {data.items.length > 0 && (
        <Paginate
          currentPage={page}
          hasPrevPage={data.meta.hasPrevPage}
          hasNextPage={data.meta.hasNextPage}
          onPageChange={setPage}
        />
      )}
    </>
  );
}
