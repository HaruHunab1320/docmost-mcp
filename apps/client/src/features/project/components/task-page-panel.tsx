import {
  ActionIcon,
  Box,
  Divider,
  Group,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  useMantineTheme,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconAt, IconEdit, IconPaperclip, IconSend, IconTrash, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { userAtom } from "@/features/user/atoms/current-user-atom";
import { useTaskByPageId, useUpdateTaskMutation, useAssignTaskMutation } from "@/features/project/hooks/use-tasks";
import { useTaskLabels } from "@/features/project/hooks/use-task-labels";
import { useAssignTaskLabel, useRemoveTaskLabel } from "@/features/project/hooks/use-task-labels";
import { useCommentsQuery, useCreateCommentMutation, useUpdateCommentMutation, useDeleteCommentMutation } from "@/features/comment/queries/comment-query";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { UserSelect } from "@/features/user/components/user-select";
import { getTaskBucket } from "@/features/gtd/utils/task-buckets";
import { Label, TaskBucket, TaskPriority, TaskStatus } from "@/features/project/types";
import classes from "./task-page-panel.module.css";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface TaskPagePanelProps {
  pageId: string;
}

export function TaskPagePanel({ pageId }: TaskPagePanelProps) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const [currentUser] = useAtom(userAtom);
  const taskQuery = useTaskByPageId(pageId);
  const task = taskQuery.data;
  const updateTaskMutation = useUpdateTaskMutation();
  const assignTaskMutation = useAssignTaskMutation();
  const { data: taskLabelsData = [] } = useTaskLabels();
  const taskLabels = Array.isArray(taskLabelsData) ? taskLabelsData : [];
  const assignLabelMutation = useAssignTaskLabel();
  const removeLabelMutation = useRemoveTaskLabel();
  const [assigneeId, setAssigneeId] = useState<string | null>(
    task?.assigneeId || null,
  );
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState("");

  const commentsQuery = useCommentsQuery({ pageId, limit: 100 });
  const comments = commentsQuery.data?.items || [];
  const createCommentMutation = useCreateCommentMutation();
  const updateCommentMutation = useUpdateCommentMutation();
  const deleteCommentMutation = useDeleteCommentMutation(pageId);

  useEffect(() => {
    setAssigneeId(task?.assigneeId || null);
  }, [task?.assigneeId]);

  if (!task) {
    return null;
  }

  const propertyLabelWidth = 96;
  const propertyRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.xs,
  } as const;
  const propertyControlStyle = {
    flex: 1,
    maxWidth: 360,
  } as const;

  const controlBorder = `1px solid ${
    theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
  }`;
  const inputClassNames = { input: classes.inlineInput };
  const dropdownStyles = { dropdown: { border: controlBorder } };

  const labelOptions = taskLabels.map((label: Label) => ({
    value: label.id,
    label: label.name,
  }));
  const selectedLabelIds = task.labels?.map((label) => label.id) || [];
  const bucketValue = task ? getTaskBucket(task) : "none";

  const serializeCommentContent = (value: string) =>
    JSON.stringify({ text: value.trim() });

  const handleCreateComment = async () => {
    if (!newComment.trim()) return;
    await createCommentMutation.mutateAsync({
      pageId,
      content: serializeCommentContent(newComment),
    });
    setNewComment("");
  };

  const getCommentText = (content: string) => {
    if (!content) return "";
    if (typeof content !== "string") {
      if (content && typeof content === "object" && "text" in content) {
        return String((content as { text?: string }).text ?? "");
      }
      return String(content);
    }
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === "string") {
        return parsed;
      }
      if (parsed && typeof parsed === "object" && "text" in parsed) {
        return String(parsed.text ?? "");
      }
    } catch {
      // Not JSON, fall back to raw content.
    }
    return content;
  };

  const handleStartEditComment = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingCommentValue(getCommentText(content));
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentValue("");
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingCommentValue.trim()) return;
    await updateCommentMutation.mutateAsync({
      commentId,
      content: serializeCommentContent(editingCommentValue),
    });
    setEditingCommentId(null);
    setEditingCommentValue("");
    commentsQuery.refetch();
  };

  return (
    <Box mt="sm" mb="lg">
      <Stack gap="md">
        <Stack gap="sm">
          <Text size="sm" fw={600} c="dimmed">
            {t("Properties")}
          </Text>
          <Box style={propertyRowStyle}>
            <Text fw={500} size="sm" c="dimmed" style={{ width: propertyLabelWidth }}>
              {t("Status")}
            </Text>
              <Select
                data={STATUS_OPTIONS}
                value={task.status}
                onChange={(value) =>
                  updateTaskMutation.mutate(
                    {
                      taskId: task.id,
                      status: (value || task.status) as TaskStatus,
                    },
                    {
                      onSuccess: () => taskQuery.refetch(),
                    },
                  )
                }
                size="sm"
                classNames={inputClassNames}
                styles={dropdownStyles}
                style={propertyControlStyle}
              />
            </Box>

          <Box style={propertyRowStyle}>
            <Text fw={500} size="sm" c="dimmed" style={{ width: propertyLabelWidth }}>
              {t("Priority")}
            </Text>
              <Select
                data={PRIORITY_OPTIONS}
                value={task.priority}
                onChange={(value) =>
                  updateTaskMutation.mutate(
                    {
                      taskId: task.id,
                      priority: (value || task.priority) as TaskPriority,
                    },
                    {
                      onSuccess: () => taskQuery.refetch(),
                    },
                  )
                }
                size="sm"
                classNames={inputClassNames}
                styles={dropdownStyles}
                style={propertyControlStyle}
              />
            </Box>

          <Box style={propertyRowStyle}>
            <Text fw={500} size="sm" c="dimmed" style={{ width: propertyLabelWidth }}>
              {t("Due Date")}
            </Text>
              <DateInput
                value={task.dueDate ? new Date(task.dueDate) : null}
                onChange={(date) =>
                  updateTaskMutation.mutate(
                    {
                      taskId: task.id,
                      dueDate: date,
                    },
                    {
                      onSuccess: () => taskQuery.refetch(),
                    },
                  )
                }
                placeholder={t("Set due date")}
                clearable
                valueFormat="MMM DD, YYYY"
                size="sm"
                classNames={inputClassNames}
                style={propertyControlStyle}
              />
            </Box>

          <Box style={propertyRowStyle}>
            <Text fw={500} size="sm" c="dimmed" style={{ width: propertyLabelWidth }}>
              {t("Assignee")}
            </Text>
              <Group style={propertyControlStyle} gap="xs" wrap="nowrap">
                <UserSelect
                  value={assigneeId}
                  onChange={(value) => {
                    const next = value || null;
                    setAssigneeId(next);
                    assignTaskMutation.mutate(
                      {
                        taskId: task.id,
                        assigneeId: next || undefined,
                      },
                      {
                        onSuccess: () => taskQuery.refetch(),
                      },
                    );
                  }}
                  placeholder={t("Assign to...")}
                  classNames={inputClassNames}
                  style={{ flex: 1 }}
                />
                {assigneeId && (
                  <ActionIcon
                    size="xs"
                    onClick={() => {
                      setAssigneeId(null);
                      assignTaskMutation.mutate(
                        {
                          taskId: task.id,
                          assigneeId: undefined,
                        },
                        {
                          onSuccess: () => taskQuery.refetch(),
                        },
                      );
                    }}
                    color="gray"
                    variant="subtle"
                  >
                    <IconX size={12} />
                  </ActionIcon>
                )}
              </Group>
            </Box>

          <Box style={propertyRowStyle}>
            <Text fw={500} size="sm" c="dimmed" style={{ width: propertyLabelWidth }}>
              {t("Bucket")}
            </Text>
              <Select
                data={[
                  { value: "none", label: t("None") },
                  { value: "waiting", label: t("Waiting") },
                  { value: "someday", label: t("Someday") },
                ]}
                value={bucketValue || "none"}
                onChange={(value) =>
                  updateTaskMutation.mutate(
                    {
                      taskId: task.id,
                      bucket: (value || "none") as TaskBucket,
                    },
                    {
                      onSuccess: () => taskQuery.refetch(),
                    },
                  )
                }
                size="sm"
                classNames={inputClassNames}
                styles={dropdownStyles}
                style={propertyControlStyle}
              />
            </Box>

          <Box style={propertyRowStyle}>
            <Text fw={500} size="sm" c="dimmed" style={{ width: propertyLabelWidth }}>
              {t("Labels")}
            </Text>
              <MultiSelect
                data={labelOptions}
                value={selectedLabelIds}
                onChange={(values) => {
                  const next = values as string[];
                  const added = next.filter(
                    (labelId) => !selectedLabelIds.includes(labelId),
                  );
                  const removed = selectedLabelIds.filter(
                    (labelId) => !next.includes(labelId),
                  );

                  added.forEach((labelId) =>
                    assignLabelMutation.mutate(
                      { taskId: task.id, labelId },
                      {
                        onSuccess: () => taskQuery.refetch(),
                      },
                    ),
                  );
                  removed.forEach((labelId) =>
                    removeLabelMutation.mutate(
                      { taskId: task.id, labelId },
                      {
                        onSuccess: () => taskQuery.refetch(),
                      },
                    ),
                  );
                }}
                placeholder={t("Assign labels...")}
                searchable
                clearable
                size="sm"
                classNames={inputClassNames}
                style={propertyControlStyle}
              />
            </Box>
        </Stack>

        <Divider />

        <Box>
          <Text size="sm" fw={600} c="dimmed" mb="xs">
            {t("Comments")}
          </Text>
          <Box>
            {comments.length > 0 &&
              comments.map((comment) => {
                const isOwnComment = currentUser?.id === comment.creatorId;
                return (
                  <Box key={comment.id} mb="sm">
                    <Group gap="xs" mb={4} wrap="nowrap">
                      <CustomAvatar
                        size="sm"
                        radius="xl"
                        avatarUrl={comment.creator?.avatarUrl}
                        name={comment.creator?.name || ""}
                      />
                      <Group
                        gap="xs"
                        justify="space-between"
                        style={{ flex: 1 }}
                        wrap="nowrap"
                      >
                        <Text size="sm" fw={500}>
                          {comment.creator?.name}
                        </Text>
                        {isOwnComment && (
                          <Group gap={4}>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="xs"
                              onClick={() =>
                                handleStartEditComment(
                                  comment.id,
                                  comment.content,
                                )
                              }
                              aria-label={t("Edit comment")}
                            >
                              <IconEdit size={14} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="xs"
                              onClick={() =>
                                deleteCommentMutation.mutate(comment.id)
                              }
                              aria-label={t("Delete comment")}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                        )}
                      </Group>
                    </Group>
                    {editingCommentId === comment.id ? (
                      <Box ml={36}>
                        <Textarea
                          value={editingCommentValue}
                          onChange={(event) =>
                            setEditingCommentValue(event.currentTarget.value)
                          }
                          minRows={2}
                          classNames={inputClassNames}
                        />
                        <Group gap="xs" mt="xs">
                          <ActionIcon
                            size="xs"
                            color="green"
                            variant="subtle"
                            onClick={() => handleSaveEditComment(comment.id)}
                          >
                            <IconSend size={14} />
                          </ActionIcon>
                          <ActionIcon
                            size="xs"
                            color="gray"
                            variant="subtle"
                            onClick={handleCancelEditComment}
                          >
                            <IconX size={14} />
                          </ActionIcon>
                        </Group>
                      </Box>
                    ) : (
                      <Text size="sm" ml={36}>
                        {getCommentText(comment.content)}
                      </Text>
                    )}
                  </Box>
                );
              })}

            <Group gap="xs" align="center" mt="xs">
              <CustomAvatar
                size="sm"
                radius="xl"
                avatarUrl={currentUser?.avatarUrl || null}
                name={currentUser?.name || t("You")}
              />
              <TextInput
                placeholder={t("Add a comment...")}
                variant="filled"
                size="sm"
                style={{ flex: 1 }}
                value={newComment}
                onChange={(e) => setNewComment(e.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateComment();
                  }
                }}
                classNames={inputClassNames}
              />

              {(newComment.trim() || comments.length > 0) && (
                <Group gap={4}>
                  <ActionIcon variant="subtle" color="gray" size="sm">
                    <IconAt size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="gray" size="sm">
                    <IconPaperclip size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    size="sm"
                    onClick={handleCreateComment}
                    disabled={!newComment.trim()}
                  >
                    <IconSend size={16} />
                  </ActionIcon>
                </Group>
              )}
            </Group>
          </Box>
        </Box>

        <Divider />
      </Stack>
    </Box>
  );
}
