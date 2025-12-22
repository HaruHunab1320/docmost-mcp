import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Group, Text, Stack } from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import clsx from "clsx";
import { useElementSize, useMergedRef } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { useTasksByProject } from "../hooks/use-tasks";
import { getPageById } from "@/features/page/services/page-service";
import classes from "../styles/project-file-tree.module.css";

// Types for the tree nodes
interface ProjectFileNode {
  id: string;
  name: string;
  type: "document";
  spaceId?: string;
  projectId?: string;
  url?: string;
}

interface ProjectFileTreeProps {
  projectId: string;
  spaceId: string;
}

export function ProjectFileTree({
  projectId,
  spaceId,
}: ProjectFileTreeProps) {
  const { t } = useTranslation();
  const [treeData, setTreeData] = useState<ProjectFileNode[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const rootElement = useRef<HTMLDivElement>(null);
  const { ref: sizeRef, height } = useElementSize();
  const mergedRef = useMergedRef(rootElement, sizeRef);
  const navigate = useNavigate();
  const { data: tasksData, isLoading: isTasksLoading } = useTasksByProject({
    projectId,
    page: 1,
    limit: 200,
  });

  useEffect(() => {
    const pageIds = Array.from(
      new Set(
        (tasksData?.items || [])
          .map((task) => task.pageId)
          .filter((pageId): pageId is string => Boolean(pageId)),
      ),
    );

    if (!pageIds.length) {
      setTreeData([]);
      return;
    }

    let isActive = true;
    setIsLoadingPages(true);

    Promise.all(pageIds.map((pageId) => getPageById({ pageId })))
      .then((pages) => {
        if (!isActive) return;
        const nodes = pages
          .filter(Boolean)
          .map((page) => ({
            id: page.id,
            name: page.title || t("Untitled"),
            type: "document" as const,
            projectId,
            spaceId,
            url: `/s/${spaceId}/p/${page.slugId || page.id}`,
          }));
        setTreeData(nodes);
      })
      .catch(() => {
        if (!isActive) return;
        notifications.show({
          message: t("Failed to load project pages"),
          color: "red",
        });
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingPages(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [projectId, spaceId, tasksData?.items, t]);

  const handleFileSelect = (fileId: string) => {
    setSelectedFile(fileId);
  };

  const renderTreeNode = (node: ProjectFileNode) => {
    const isSelected = selectedFile === node.id;

    const getFileIcon = () => {
      return <IconFileText size={16} color="#74c0fc" />;
    };

    return (
      <React.Fragment key={node.id}>
        <div
          className={clsx(classes.node, isSelected && classes.nodeSelected)}
          onClick={() => {
            handleFileSelect(node.id);
            if (node.url) {
              navigate(node.url);
            }
          }}
        >
          <Group gap={4} wrap="nowrap">
            {getFileIcon()}

            <Text
              size="xs"
              className={classes.nodeLabel}
              fw={isSelected ? 600 : 400}
            >
              {node.name}
            </Text>
          </Group>
        </div>
      </React.Fragment>
    );
  };

  return (
    <Box ref={mergedRef} h={height} className={classes.treeContainer}>
      {isTasksLoading || isLoadingPages ? (
        <Stack align="center" justify="center" h="100%" p="md" gap="xs">
          <Text size="sm" c="dimmed">
            {t("Loading project pages...")}
          </Text>
        </Stack>
      ) : treeData.length > 0 ? (
        <div>{treeData.map((node) => renderTreeNode(node))}</div>
      ) : (
        <Stack align="center" justify="center" h="100%" p="md" gap="xs">
          <Text size="sm" c="dimmed">
            {t("No linked pages found in this project")}
          </Text>
        </Stack>
      )}
    </Box>
  );
}
