import { NodeApi, NodeRendererProps, Tree, TreeApi } from "react-arborist";
import { atom, useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionIcon, Box, Group, Menu, Text, Tooltip } from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useDisclosure, useElementSize, useMergedRef } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";

import { Task, TaskStatus } from "../types";
import { useTasksByProject } from "../hooks/use-tasks";
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "../hooks/use-task-mutations";
import classes from "../styles/project-tree.module.css";

// Atoms to store tree state
const openTaskNodesAtom = atom<Record<string, boolean>>({});

// Types for the tree nodes
interface ProjectTaskNode {
  id: string;
  name: string;
  children?: ProjectTaskNode[];
  status: TaskStatus;
  parentId?: string | null;
  isParent?: boolean;
  spaceId?: string;
}

interface ProjectTreeProps {
  projectId: string;
  readOnly?: boolean;
  onTaskSelect?: (taskId: string) => void;
  spaceId: string;
}

export function ProjectTree({
  projectId,
  readOnly = false,
  onTaskSelect,
  spaceId,
}: ProjectTreeProps) {
  const { t } = useTranslation();
  const [treeData, setTreeData] = useState<ProjectTaskNode[]>([]);
  const treeRef = useRef<TreeApi<ProjectTaskNode>>(null);
  const [openTaskNodes, setOpenTaskNodes] = useAtom(openTaskNodesAtom);
  const rootElement = useRef<HTMLDivElement>(null);
  const { ref: sizeRef, width, height } = useElementSize();
  const mergedRef = useMergedRef(rootElement, sizeRef);
  const isDataLoaded = useRef(false);
  const navigate = useNavigate();

  // Fetch tasks for the project
  const { data: tasksData, isLoading } = useTasksByProject({
    projectId,
    limit: 100,
  });

  // Build tree data from tasks
  useEffect(() => {
    if (tasksData?.items && !isLoading) {
      // Convert flat tasks to tree structure
      const tasks = tasksData.items;
      const taskMap = new Map<string, ProjectTaskNode>();
      const rootNodes: ProjectTaskNode[] = [];

      // First pass: Create nodes
      tasks.forEach((task) => {
        taskMap.set(task.id, {
          id: task.id,
          name: task.title,
          status: task.status as TaskStatus,
          parentId: task.parentTaskId,
          children: [],
          isParent: false,
          spaceId: task.spaceId,
        });
      });

      // Second pass: Build tree structure
      tasks.forEach((task) => {
        const node = taskMap.get(task.id);
        if (node) {
          if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
            const parentNode = taskMap.get(task.parentTaskId);
            if (parentNode) {
              if (!parentNode.children) {
                parentNode.children = [];
              }
              parentNode.children.push(node);
              parentNode.isParent = true;
            }
          } else {
            rootNodes.push(node);
          }
        }
      });

      // Update tree data
      setTreeData(rootNodes);
      isDataLoaded.current = true;
    }
  }, [tasksData, isLoading]);


  const handleOpenClose = (nodeId: string, isOpen: boolean) => {
    setOpenTaskNodes((prev) => ({ ...prev, [nodeId]: isOpen }));
  };

  const handleTaskSelect = (node: ProjectTaskNode) => {
    if (onTaskSelect) {
      onTaskSelect(node.id);
    }
  };

  return (
    <Box ref={mergedRef} h={height} className={classes.treeContainer}>
      {treeData.length > 0 ? (
        <Tree<ProjectTaskNode>
          ref={treeRef}
          data={treeData}
          openByDefault={false}
          width={width || 300}
          height={height || 300}
          indent={16}
          rowHeight={28}
          onToggle={(nodeId: string) =>
            handleOpenClose(nodeId, true)
          }
          onSelect={(nodes) => {
            if (nodes.length > 0 && onTaskSelect) {
              onTaskSelect(nodes[0].data.id);
            }
          }}
          selection={undefined}
        >
          {(props) => (
            <TaskNode
              {...props}
              readOnly={readOnly}
              projectId={projectId}
              spaceId={spaceId}
            />
          )}
        </Tree>
      ) : (
        <Text size="sm" c="dimmed" p="md" className={classes.emptyState}>
          {isLoading
            ? t("Loading tasks...")
            : t("No tasks found in this project")}
        </Text>
      )}
    </Box>
  );
}

interface TaskNodeProps extends NodeRendererProps<ProjectTaskNode> {
  readOnly: boolean;
  projectId: string;
  spaceId: string;
}

function TaskNode({
  node,
  style,
  dragHandle,
  tree,
  readOnly,
  projectId,
  spaceId,
}: TaskNodeProps) {
  const { t } = useTranslation();
  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const [opened, { open, close }] = useDisclosure(false);

  const isSelected = node.isSelected;
  const isActive = node.isSelected;
  const nodeData = node.data;

  const handleDelete = () => {
    if (nodeData.isParent) {
      notifications.show({
        title: t("Cannot delete"),
        message: t("This task has subtasks. Please delete the subtasks first."),
        color: "red",
      });
      return;
    }

    deleteTaskMutation.mutate(
      { taskId: nodeData.id },
      {
        onSuccess: () => {
          notifications.show({
            title: t("Task deleted"),
            message: t("The task has been successfully deleted"),
            color: "green",
          });
        },
        onError: () => {
          notifications.show({
            title: t("Error"),
            message: t("Failed to delete the task"),
            color: "red",
          });
        },
      }
    );
  };

  return (
    <div
      style={style}
      ref={dragHandle}
      className={clsx(classes.treeRow, {
        [classes.activeTreeRow]: isActive,
        [classes.selectedTreeRow]: isSelected,
      })}
    >
      <Group
        justify="space-between"
        wrap="nowrap"
        className={classes.treeNodeInner}
      >
        <Group wrap="nowrap" className={classes.treeNodeLeft}>
          {nodeData.isParent ? (
            <TaskArrow node={node} />
          ) : (
            <div style={{ width: 16 }} />
          )}

          <div
            className={clsx(
              classes.statusIndicator,
              classes[`status-${nodeData.status}`]
            )}
          />

          <Text
            size="sm"
            className={clsx(classes.nodeName, {
              [classes.completedTask]: nodeData.status === "done",
            })}
          >
            {nodeData.name}
          </Text>
        </Group>

        {!readOnly && (
          <Group gap={4} wrap="nowrap" className={classes.treeNodeActions}>
            <TaskMenu
              node={node}
              projectId={projectId}
              handleDelete={handleDelete}
              spaceId={spaceId}
            />
          </Group>
        )}
      </Group>
    </div>
  );
}

interface TaskArrowProps {
  node: NodeApi<ProjectTaskNode>;
}

function TaskArrow({ node }: TaskArrowProps) {
  const isOpen = node.isOpen;

  return (
    <div className={classes.arrowContainer} onClick={() => node.toggle()}>
      {isOpen ? (
        <IconChevronDown size={16} stroke={1.5} />
      ) : (
        <IconChevronRight size={16} stroke={1.5} />
      )}
    </div>
  );
}

interface TaskMenuProps {
  node: NodeApi<ProjectTaskNode>;
  projectId: string;
  handleDelete: () => void;
  spaceId: string;
}

function TaskMenu({ node, projectId, handleDelete, spaceId }: TaskMenuProps) {
  const { t } = useTranslation();
  const nodeData = node.data;
  const createTaskMutation = useCreateTaskMutation();

  const handleAddSubtask = () => {
    createTaskMutation.mutate(
      {
        title: t("New subtask"),
        description: "",
        projectId: projectId,
        parentTaskId: nodeData.id,
        status: "todo",
        spaceId: spaceId,
      },
      {
        onSuccess: () => {
          node.open();
          notifications.show({
            title: t("Subtask created"),
            message: t("A new subtask has been created"),
            color: "green",
          });
        },
      }
    );
  };

  return (
    <Menu shadow="md" position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          size="xs"
          variant="subtle"
          className={classes.actionButton}
          aria-label={t("Task actions")}
        >
          <IconDotsVertical size={14} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconPlus size={14} />}
          onClick={handleAddSubtask}
        >
          {t("Add subtask")}
        </Menu.Item>
        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => {}}>
          {t("Edit task")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconTrash size={14} />}
          color="red"
          onClick={() => (nodeData.isParent ? null : handleDelete())}
          disabled={nodeData.isParent}
        >
          {t("Delete task")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
