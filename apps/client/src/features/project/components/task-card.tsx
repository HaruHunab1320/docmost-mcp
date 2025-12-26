import {
  Badge,
  Card,
  Group,
  Text,
  ActionIcon,
  Menu,
  TextInput,
  Tooltip,
  Divider,
  useMantineTheme,
} from "@mantine/core";
import { Task } from "../types";
import { getTaskBucket } from "@/features/gtd/utils/task-buckets";
import {
  IconCheck,
  IconDotsVertical,
  IconEdit,
  IconExternalLink,
  IconEye,
  IconStar,
  IconLink,
  IconCopy,
  IconArrowsExchange,
  IconTrash,
  IconMessage,
  IconAdjustments,
  IconSquarePlus,
  IconArticle,
  IconFileText,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUpdateTaskMutation } from "../hooks/use-tasks";
import EmojiPicker from "@/components/ui/emoji-picker";
import { useAtom } from "jotai";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom";
import { useQuery } from "@tanstack/react-query";
import { listGoalsForTask } from "@/features/goal/services/goal-service";
import { Goal } from "@/features/goal/types";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
  users?: any[];
  goalMap?: Record<string, Goal[]>;
}

export function TaskCard({
  task,
  onClick,
  isDragging = false,
  users = [],
  goalMap,
}: TaskCardProps) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const [workspace] = useAtom(workspaceAtom);
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const updateTaskMutation = useUpdateTaskMutation();

  // Handle title edit
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.currentTarget.value);
  };

  const handleTitleBlur = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitle(task.title);
      setIsEditing(false);
      return;
    }

    if (trimmedTitle !== task.title) {
      updateTaskMutation.mutate({
        taskId: task.id,
        title: trimmedTitle,
      });
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTitleBlur();
    } else if (e.key === "Escape") {
      setTitle(task.title); // Reset to original
      setIsEditing(false);
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    updateTaskMutation.mutate({
      taskId: task.id,
      icon: emoji.native,
    });
  };

  const handleEmojiRemove = () => {
    updateTaskMutation.mutate({
      taskId: task.id,
      icon: null,
    });
  };

  // Prevent card click when clicking on menu items
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Open the linked page when clicking on the page icon
  const handlePageIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.pageId) {
      // If we have a page link in the description, extract it
      const pageUrlMatch = task.description?.match(
        /\[View page details\]\(([^)]+)\)/
      );
      if (pageUrlMatch && pageUrlMatch[1]) {
        navigate(pageUrlMatch[1]);
      }
    }
  };

  const bucket = getTaskBucket(task);
  const taskGoalsQuery = useQuery({
    queryKey: ["task-goals", task.id, workspace?.id],
    queryFn: () =>
      listGoalsForTask({
        workspaceId: workspace?.id || "",
        taskId: task.id,
      }),
    enabled: !!workspace?.id && !goalMap,
  });
  const taskGoals = goalMap?.[task.id] || taskGoalsQuery.data || [];
  const entityLinksQuery = useQuery({
    queryKey: ["entity-links", task.id, workspace?.id],
    queryFn: () =>
      agentMemoryService.links({
        workspaceId: workspace?.id || "",
        taskIds: [task.id],
        limit: 3,
      }),
    enabled: !!workspace?.id,
  });
  const taskEntityLinks =
    entityLinksQuery.data?.taskLinks?.[task.id] || [];

  const getGoalColor = (horizon: string) => {
    switch (horizon) {
      case "short":
        return "teal";
      case "mid":
        return "blue";
      case "long":
        return "grape";
      default:
        return "gray";
    }
  };

  return (
    <Card
      shadow="xs"
      withBorder
      p="xs"
      style={{
        width: "100%",
        opacity: isDragging ? 0.8 : 1,
        cursor: isEditing ? "default" : "pointer",
        backgroundColor: isDragging ? theme.colors.gray[0] : undefined,
      }}
      onClick={isEditing ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        {/* Task icon/emoji */}
        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          removeEmojiAction={handleEmojiRemove}
          readOnly={false}
          icon={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: "50%",
                backgroundColor:
                  task.status === "done"
                    ? theme.colors.teal[5]
                    : "transparent",
                border:
                  task.status === "done"
                    ? "none"
                    : `1px solid ${theme.colors.gray[5]}`,
                fontSize: 12,
              }}
            >
              {task.status === "done" ? (
                <IconCheck size={14} color="white" />
              ) : task.icon ? (
                task.icon
              ) : (
                <div style={{ width: 14, height: 14 }} />
              )}
            </div>
          }
        />

        {/* Task title or editing input */}
        {isEditing ? (
          <TextInput
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            styles={{ input: { height: 24 } }}
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1 }}
          />
        ) : (
          <Group gap="xs" style={{ flex: 1 }}>
            <Text fw={500} size="sm" lineClamp={1} style={{ flex: 1 }}>
              {task.title}
            </Text>

            {(bucket === "waiting" || bucket === "someday") && (
              <Badge size="sm" variant="light" color="gray">
                {bucket === "waiting" ? t("Waiting") : t("Someday")}
              </Badge>
            )}

            {/* Page indicator */}
            {task.pageId && (
              <Tooltip label={t("This task has a linked page")}>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="blue"
                  onClick={handlePageIconClick}
                >
                  <IconFileText size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        )}

        {/* Hover actions */}
        {hovered && !isEditing && (
          <Group gap="xs" style={{ flexShrink: 0 }}>
            <Tooltip label={t("Edit title")}>
              <ActionIcon size="sm" variant="subtle" onClick={handleEditClick}>
                <IconEdit size={14} />
              </ActionIcon>
            </Tooltip>

            <div onClick={handleMenuClick}>
              <Menu position="bottom-end" shadow="md">
                <Menu.Target>
                  <ActionIcon size="sm" variant="subtle">
                    <IconDotsVertical size={14} />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconStar size={14} />}>
                    {t("Add to favorites")}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconLink size={14} />}>
                    {t("Copy link")}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconCopy size={14} />}>
                    {t("Duplicate")}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconArrowsExchange size={14} />}>
                    {t("Move to...")}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconTrash size={14} />}
                    color={theme.colors.red[6]}
                  >
                    {t("Delete")}
                  </Menu.Item>

                  <Divider />

                  <Menu.Item leftSection={<IconAdjustments size={14} />}>
                    {t("Edit properties")}
                  </Menu.Item>

                  <Divider />

                  <Menu.Item leftSection={<IconMessage size={14} />}>
                    {t("Comment")}
                  </Menu.Item>
                  <Menu.Label>{t("Open in")}</Menu.Label>
                  <Menu.Item leftSection={<IconExternalLink size={14} />}>
                    {t("New tab")}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconExternalLink size={14} />}>
                    {t("New window")}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconEye size={14} />}>
                    {t("Full page")}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconSquarePlus size={14} />}>
                    {t("Side peek")}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </div>
          </Group>
        )}
      </Group>

      {(taskGoals.length > 0 || taskEntityLinks.length > 0) && (
        <Group gap={6} mt={6} wrap="wrap">
          {taskGoals.slice(0, 3).map((goal) => (
            <Badge
              key={goal.id}
              size="xs"
              variant="light"
              color={getGoalColor(goal.horizon)}
            >
              {goal.name}
            </Badge>
          ))}
          {taskGoals.length > 3 && (
            <Badge size="xs" variant="light" color="gray">
              {t("+{{count}}", { count: taskGoals.length - 3 })}
            </Badge>
          )}
          {taskEntityLinks.slice(0, 2).map((entity) => (
            <Badge
              key={entity.entityId}
              size="xs"
              variant="light"
              color="yellow"
            >
              {entity.entityName || "Entity"}
            </Badge>
          ))}
          {taskEntityLinks.length > 2 && (
            <Badge size="xs" variant="light" color="yellow">
              {t("+{{count}}", { count: taskEntityLinks.length - 2 })}
            </Badge>
          )}
        </Group>
      )}
    </Card>
  );
}
