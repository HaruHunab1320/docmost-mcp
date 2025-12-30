import { useState, useEffect, Suspense, lazy, useMemo } from "react";
import {
  Drawer,
  Button,
  TextInput,
  Textarea,
  Group,
  Stack,
  Select,
  ActionIcon,
  Flex,
  Box,
  Text,
  Divider,
  UnstyledButton,
  Menu,
  Badge,
  Avatar,
  Title,
  rem,
  useMantineTheme,
  Image,
  Paper,
  useMantineColorScheme,
  Tooltip,
  Center,
  Modal,
  FileInput,
  MultiSelect,
} from "@mantine/core";
import { Label, LabelColor, Task, TaskPriority, TaskStatus } from "../types";
import { getTaskBucket } from "@/features/gtd/utils/task-buckets";
import { TaskBucket } from "@/features/project/types";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconUserCircle,
  IconX,
  IconArrowsExchange,
  IconCalendar,
  IconTag,
  IconListDetails,
  IconEdit,
  IconExternalLink,
  IconPhoto,
  IconPlus,
  IconBrandGithub,
  IconFlag,
  IconSubtask,
  IconFolder,
  IconDotsVertical,
  IconPaperclip,
  IconAt,
  IconSend,
  IconGripVertical,
  IconMoodSmile,
  IconArticle,
  IconShare,
  IconMessageCircle,
  IconStar,
  IconStarFilled,
  IconLock,
  IconCopy,
  IconCopyPlus,
  IconArrowRight,
  IconSettings,
  IconTrash,
  IconFileImport,
  IconFileExport,
  IconLink,
} from "@tabler/icons-react";
import {
  useUpdateTaskMutation,
  useAssignTaskMutation,
  useCompleteTaskMutation,
  useTask,
} from "../hooks/use-tasks";
import {
  useAssignTaskLabel,
  useCreateTaskLabel,
  useDeleteTaskLabel,
  useRemoveTaskLabel,
  useTaskLabels,
  useUpdateTaskLabel,
} from "../hooks/use-task-labels";
import { UserSelect } from "@/features/user/components/user-select";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "@mantine/form";
import { DateInput } from "@mantine/dates";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { useAtom } from "jotai";
import { userAtom, workspaceAtom } from "@/features/user/atoms/current-user-atom";
import { formatDistanceToNow } from "date-fns";
import { useDisclosure } from "@mantine/hooks";
import EmojiPicker from "@/components/ui/emoji-picker";
import { api } from "@/lib/api";
import { notifications } from "@mantine/notifications";
import {
  useCreatePageMutation,
  usePageQuery,
} from "@/features/page/queries/page-query";
import {
  useCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useUpdateCommentMutation,
} from "@/features/comment/queries/comment-query";
import { useSpaceQuery } from "@/features/space/queries/space-query";
import { buildPageUrl } from "@/features/page/page.utils";
import {
  assignGoal,
  listGoals,
  listGoalsForTask,
  unassignGoal,
} from "@/features/goal/services/goal-service";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";
import PageEditor from "@/features/editor/page-editor";
// Lazy load Picker from emoji-mart to avoid SSR issues
const Picker = lazy(() => import("@emoji-mart/react"));

interface TaskDrawerProps {
  taskId?: string | null;
  opened: boolean;
  onClose: () => void;
  spaceId: string;
}

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

const getPriorityColor = (priority: TaskPriority) => {
  switch (priority) {
    case "low":
      return "blue";
    case "medium":
      return "yellow";
    case "high":
      return "orange";
    case "urgent":
      return "red";
    default:
      return "gray";
  }
};

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

export function TaskDrawer({
  taskId,
  opened,
  onClose,
  spaceId,
}: TaskDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [lastEditedBy, setLastEditedBy] = useState<string | null>(null);
  const [lastEditedAt, setLastEditedAt] = useState<Date | null>(null);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState("");
  const [currentUser] = useAtom(userAtom);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [workspace] = useAtom(workspaceAtom);
  const workspaceId = workspace?.id;
  // Use the useTask hook to fetch task data
  const { data: task, isLoading, refetch } = useTask(taskId);
  const { data: space } = useSpaceQuery(spaceId || "");
  const pageQuery = usePageQuery({ pageId: task?.pageId || "" });
  const propertyLabelWidth = 110;
  const propertyRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.sm,
  } as const;
  const propertyRowTopAlignStyle = {
    ...propertyRowStyle,
    alignItems: "flex-start",
  } as const;
  const propertyControlStyle = {
    flex: 1,
    maxWidth: 360,
  } as const;
  const surfaceColor =
    colorScheme === "dark" ? theme.colors.dark[7] : theme.white;
  const panelBorder = `1px solid ${
    colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
  }`;
  const panelMuted =
    colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0];
  const propertyInputStyles = {
    input: {
      backgroundColor:
        colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
      border: `1px solid ${
        colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
      }`,
      borderRadius: theme.radius.sm,
      paddingInline: theme.spacing.xs,
    },
  };
  const textareaStyles = {
    input: {
      backgroundColor:
        colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
      border: `1px solid ${
        colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
      }`,
      borderRadius: theme.radius.sm,
      paddingInline: theme.spacing.xs,
    },
  };

  const commentsQuery = useCommentsQuery({
    pageId: task?.pageId || "",
    limit: 100,
  });
  const comments = commentsQuery.data?.items || [];
  const createCommentMutation = useCreateCommentMutation();
  const updateCommentMutation = useUpdateCommentMutation();
  const deleteCommentMutation = useDeleteCommentMutation(task?.pageId);

  const serializeCommentContent = (value: string) =>
    JSON.stringify({ text: value.trim() });

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

  const handleCreateComment = async () => {
    if (!task?.pageId || !newComment.trim()) return;
    await createCommentMutation.mutateAsync({
      pageId: task.pageId,
      content: serializeCommentContent(newComment),
    });
    setNewComment("");
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
  const [coverModalOpened, { open: openCoverModal, close: closeCoverModal }] =
    useDisclosure(false);
  const [
    emojiPickerOpened,
    { open: openEmojiPicker, close: closeEmojiPicker },
  ] = useDisclosure(false);
  const [isHoveringEmoji, setIsHoveringEmoji] = useState(false);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [labelDrafts, setLabelDrafts] = useState<
    Array<{ id: string; name: string; color: LabelColor }>
  >([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState<LabelColor>("blue");

  const bucketValue = task ? getTaskBucket(task) : "none";
  const selectedLabelIds = task?.labels?.map((label) => label.id) || [];
  const labelColorOptions: { value: LabelColor; label: string }[] = [
    { value: "red", label: "Red" },
    { value: "pink", label: "Pink" },
    { value: "grape", label: "Grape" },
    { value: "violet", label: "Violet" },
    { value: "indigo", label: "Indigo" },
    { value: "blue", label: "Blue" },
    { value: "cyan", label: "Cyan" },
    { value: "teal", label: "Teal" },
    { value: "green", label: "Green" },
    { value: "lime", label: "Lime" },
    { value: "yellow", label: "Yellow" },
    { value: "orange", label: "Orange" },
    { value: "gray", label: "Gray" },
  ];
  const { data: taskLabelsData = [] } = useTaskLabels();
  const taskLabels = Array.isArray(taskLabelsData) ? taskLabelsData : [];
  const labelOptions = taskLabels.map((label: Label) => ({
    value: label.id,
    label: label.name,
  }));
  const taskGoalsQuery = useQuery({
    queryKey: ["task-goals", taskId, workspaceId],
    queryFn: () =>
      listGoalsForTask({
        workspaceId: workspaceId || "",
        taskId: taskId || "",
      }),
    enabled: !!taskId && !!workspaceId,
  });
  const taskGoals = taskGoalsQuery.data || [];
  const taskGoalIds = useMemo(
    () => taskGoals.map((goal) => goal.id),
    [taskGoals]
  );
  const labelDraftOptions = useMemo(
    () =>
      taskLabels.map((label: Label) => ({
        id: label.id,
        name: label.name,
        color: label.color,
      })),
    [taskLabels]
  );
  const createLabelMutation = useCreateTaskLabel();
  const updateLabelMutation = useUpdateTaskLabel();
  const deleteLabelMutation = useDeleteTaskLabel();
  const assignLabelMutation = useAssignTaskLabel();
  const removeLabelMutation = useRemoveTaskLabel();
  const entityLinksQuery = useQuery({
    queryKey: ["entity-links", taskId, workspaceId, spaceId],
    queryFn: () =>
      agentMemoryService.links({
        workspaceId: workspaceId || "",
        spaceId,
        taskIds: taskId ? [taskId] : [],
      }),
    enabled: !!taskId && !!workspaceId,
  });
  const taskEntityLinks =
    (taskId && entityLinksQuery.data?.taskLinks?.[taskId]) || [];
  const allGoalsQuery = useQuery({
    queryKey: ["goals", workspaceId, spaceId],
    queryFn: () =>
      listGoals({
        workspaceId: workspaceId || "",
        spaceId,
      }),
    enabled: !!workspaceId,
  });
  const [assignedGoalIds, setAssignedGoalIds] = useState<string[]>([]);
  const assignGoalMutation = useMutation({
    mutationFn: (goalId: string) =>
      assignGoal({ taskId: taskId || "", goalId }),
  });
  const unassignGoalMutation = useMutation({
    mutationFn: (goalId: string) =>
      unassignGoal({ taskId: taskId || "", goalId }),
  });

  const updateTaskMutation = useUpdateTaskMutation();
  const createPageMutation = useCreatePageMutation();
  const assignTaskMutation = useAssignTaskMutation();
  const completeTaskMutation = useCompleteTaskMutation();

  // Update assignee ID when task changes
  useEffect(() => {
    if (task) {
      setAssigneeId(task.assigneeId || null);
    }
  }, [task]);

  useEffect(() => {
    setAssignedGoalIds((prev) => {
      if (
        prev.length === taskGoalIds.length &&
        prev.every((id, idx) => id === taskGoalIds[idx])
      ) {
        return prev;
      }
      return taskGoalIds;
    });
  }, [taskGoalIds]);

  useEffect(() => {
    setLabelDrafts((prev) => {
      if (
        prev.length === labelDraftOptions.length &&
        prev.every(
          (draft, idx) =>
            draft.id === labelDraftOptions[idx].id &&
            draft.name === labelDraftOptions[idx].name &&
            draft.color === labelDraftOptions[idx].color
        )
      ) {
        return prev;
      }
      return labelDraftOptions;
    });
  }, [labelDraftOptions]);

  // Set initial cover image if task has one
  useEffect(() => {
    if (task?.coverImage) {
      setCoverImageUrl(task.coverImage);
    } else if (task?.id) {
      // Try to get from localStorage if server didn't return it
      const savedCoverImage = localStorage.getItem(`task-cover-${task.id}`);
      if (savedCoverImage) {
        setCoverImageUrl(savedCoverImage);
      }
    }
  }, [task]);

  // Form for editing task details
  const form = useForm({
    initialValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || "todo",
      priority: task?.priority || "medium",
      dueDate: task?.dueDate ? new Date(task.dueDate) : null,
    },
  });

  // Update form when task changes
  useEffect(() => {
    if (task) {
      form.setValues({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
      });
    }
  }, [task]);

  // Handle form submission
  const handleSubmit = form.onSubmit((values) => {
    if (!task) return;

    // Always save title changes, even if they appear to be the same
    // This ensures any whitespace changes or invisible changes are captured
    const newTitle = values.title.trim();

    // Show loading notification
    const toastId = "update-task-title";
    notifications.show({
      id: toastId,
      loading: true,
      title: t("Updating task"),
      message: t("Saving changes..."),
      autoClose: false,
      withCloseButton: false,
    });

    updateTaskMutation.mutate(
      {
        taskId: task.id,
        title: newTitle,
        description: values.description,
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate,
      },
      {
        onSuccess: (updatedTask) => {
          // Update toast notification
          notifications.update({
            id: toastId,
            color: "green",
            title: t("Task updated"),
            message: t("Task title has been saved"),
            loading: false,
            autoClose: 3000,
          });

          // Update local state immediately
          refetch();
          setIsEditingTitle(false);
          setIsEditingDescription(false);
        },
        onError: (error) => {
          // Show error toast
          notifications.update({
            id: toastId,
            color: "red",
            title: t("Error"),
            message: t("Failed to update task title"),
            loading: false,
            autoClose: 3000,
          });
        },
      }
    );
  });

  // Handle status change
  const handleStatusChange = (status: string) => {
    if (!task) return;

    updateTaskMutation.mutate(
      {
        taskId: task.id,
        status: status as TaskStatus,
      },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  // Handle priority change
  const handlePriorityChange = (priority: string) => {
    if (!task) return;

    updateTaskMutation.mutate(
      {
        taskId: task.id,
        priority: priority as TaskPriority,
      },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  // Handle assignee change
  const handleAssigneeChange = (userId: string) => {
    if (!task) return;

    // Update local state immediately for responsive UI
    setAssigneeId(userId);

    // Use the mutation
    assignTaskMutation.mutate(
      {
        taskId: task.id,
        assigneeId: userId,
      },
      {
        onSuccess: () => {
          // Successful update, refetch to synchronize
          setTimeout(() => {
            refetch();
          }, 300);
        },
        onError: () => {
          // Restore the previous assignee ID on error
          setAssigneeId(task.assigneeId);
        },
      }
    );
  };

  // Handle completion toggle
  const handleCompletionToggle = () => {
    if (!task) return;

    completeTaskMutation.mutate(
      {
        taskId: task.id,
        isCompleted: !task.isCompleted,
      },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  const handleCreatePageForTask = async () => {
    if (!task || createPageMutation.isPending) return;

    try {
      const content = JSON.stringify({
        type: "doc",
        content: task.description
          ? [
              {
                type: "paragraph",
                content: [{ type: "text", text: task.description }],
              },
            ]
          : [],
      });

      const newPage = await createPageMutation.mutateAsync({
        title: task.title,
        content,
        spaceId: task.spaceId,
        icon: task.icon || "📝",
      });

      if (newPage?.id) {
        await updateTaskMutation.mutateAsync({
          taskId: task.id,
          pageId: newPage.id,
        });
      }

      if (newPage?.slugId) {
        onClose();
        const url = space?.slug
          ? buildPageUrl(space.slug, newPage.slugId, newPage.title)
          : `/p/${newPage.slugId}`;
        navigate(url);
      }
    } catch (error) {
      notifications.show({
        message: t("Failed to create page for task"),
        color: "red",
      });
    }
  };

  const handleOpenPage = async () => {
    if (!task) return;
    if (!task.pageId) {
      await handleCreatePageForTask();
      return;
    }

    const page = pageQuery.data;
    const pageSlugId = page?.slugId || task.pageId;
    const pageTitle = page?.title || task.title;
    const url = space?.slug
      ? buildPageUrl(space.slug, pageSlugId, pageTitle)
      : `/p/${pageSlugId}`;

    onClose();
    navigate(url);
  };

  // Clear assignee
  const clearAssignee = () => {
    if (!task) return;

    // Update local state immediately for responsive UI
    setAssigneeId(null);

    // Use the mutation
    assignTaskMutation.mutate(
      {
        taskId: task.id,
        assigneeId: null,
      },
      {
        onSuccess: () => {
          // Successful update, refetch to synchronize
          setTimeout(() => {
            refetch();
          }, 300);
        },
        onError: () => {
          // Restore the previous assignee ID on error
          setAssigneeId(task.assigneeId);
        },
      }
    );
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: any) => {
    if (!task) return;

    updateTaskMutation.mutate(
      {
        taskId: task.id,
        icon: emoji.native,
      },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  // Handle emoji picker click
  const handleEmojiPickerClick = () => {
    openEmojiPicker();
  };

  // Handle removing emoji
  const handleRemoveEmoji = () => {
    if (!task) return;

    updateTaskMutation.mutate(
      {
        taskId: task.id,
        icon: null,
      },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  // Clean up when modal closes
  const handleModalClose = () => {
    // Only revoke if we're not using the image
    if (objectUrl && !coverImageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
    closeCoverModal();
  };

  // Handle file upload
  const handleFileUpload = (file: File | null) => {
    if (file) {
      setCoverImageFile(file);

      // Clean up previous object URL if it exists
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      // Create a local object URL for preview only
      const newObjectUrl = URL.createObjectURL(file);
      setObjectUrl(newObjectUrl);
      setCoverImageUrl(newObjectUrl);
    } else {
      // If file is cleared, also clear the object URL
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
      // Only clear the URL if it's an object URL (not an external URL)
      if (coverImageUrl && coverImageUrl.startsWith("blob:")) {
        setCoverImageUrl(null);
      }
      setCoverImageFile(null);
    }
  };

  // Process image URL function
  const processImageUrl = async (url: string) => {
    if (!url) return;

    // Define a consistent toast ID
    const toastId = "validate-image-url-toast";

    try {
      // First, clear any existing toasts with this ID
      notifications.hide(toastId);

      // Set upload state to prevent double uploads
      setIsUploadingCover(true);

      // Show loading notification
      notifications.show({
        id: toastId,
        title: t("Validating image URL"),
        message: t("Please wait while we validate the image URL..."),
        color: "blue",
        loading: true,
      });

      // Check if the URL is valid by loading the image
      const isValid = await new Promise<boolean>((resolve) => {
        const img = document.createElement("img");
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });

      if (isValid) {
        // Update UI
        setCoverImageUrl(url);

        // Save to database
        updateTaskMutation.mutate(
          {
            taskId: task!.id,
            coverImage: url,
          },
          {
            onSuccess: () => {
              // Save to localStorage as backup
              localStorage.setItem(`task-cover-${task!.id}`, url);
              // Custom notification with proper message
              notifications.show({
                title: t("Cover image added"),
                message: t("The cover image has been set successfully"),
                color: "green",
                autoClose: 3000,
              });
              refetch();
            },
          }
        );

        // Success notification
        notifications.update({
          id: toastId,
          title: t("Image URL validated"),
          message: t("The image URL has been set as your cover image"),
          color: "green",
          loading: false,
          autoClose: 3000,
        });

        // Close the modal
        closeCoverModal();
      } else {
        throw new Error("Invalid image URL");
      }
    } catch (error) {
      // Error notification
      notifications.update({
        id: toastId,
        title: t("Error"),
        message: t("The provided URL is not a valid image"),
        color: "red",
        loading: false,
        autoClose: 3000,
      });
    } finally {
      // Reset the upload state
      setIsUploadingCover(false);
    }
  };

  // Upload file to server
  const uploadFileToServer = async (file: File) => {
    // Define a consistent toast ID
    const toastId = "upload-cover-image-toast";

    try {
      // First, clear any existing upload toasts
      notifications.hide(toastId);

      // Set upload state to prevent double uploads
      setIsUploadingCover(true);

      // Verify spaceId exists before attempting upload
      if (!spaceId) {
        console.error("Missing spaceId for task:", task);
        throw new Error("Space ID is required for image upload");
      }

      // Create a FormData instance
      const formData = new FormData();

      // Order matters! Add non-file fields first
      formData.append("type", "project-cover");
      formData.append("spaceId", spaceId);

      // Add file with the field name the server expects
      formData.append("file", file);

      // Show loading notification with the consistent ID
      notifications.show({
        id: toastId,
        loading: true,
        title: t("Uploading image"),
        message: t("Please wait while we upload your image"),
        autoClose: false,
        withCloseButton: false,
      });

      // Upload the file using the attachment API
      const response = await api.post("/attachments/upload-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Upload response:", response);

      // Success notification - update the existing toast
      notifications.update({
        id: toastId,
        color: "green",
        title: t("Upload complete"),
        message: t("The image has been uploaded successfully"),
        loading: false,
        autoClose: 3000,
      });

      // Get the URL from the response
      if (response && typeof response === "object") {
        // Construct a direct URL to the image based on the response
        let imageUrl;

        if ("fileName" in response) {
          // Use the standardized path format based on attachment type
          imageUrl = `/api/attachments/img/project-cover/${response.fileName}`;
        } else if ("filePath" in response) {
          // If we have a full file path, use it directly
          imageUrl = `/api/attachments/img/project-cover/${(response.filePath as string).split("/").pop()}`;
        } else {
          throw new Error("Invalid response format from server");
        }

        // Wait a moment before updating the cover image to avoid conflicts
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Only update if we actually have a valid URL
        if (imageUrl) {
          // We need to prevent the local object URL from being revoked
          // since we still want to display the image
          setObjectUrl(null);

          setCoverImageUrl(imageUrl);

          // Update the task with the actual image URL from the server
          updateTaskMutation.mutate(
            {
              taskId: task!.id,
              coverImage: imageUrl,
            },
            {
              onSuccess: () => {
                // Save to localStorage as backup
                localStorage.setItem(`task-cover-${task!.id}`, imageUrl);
                // Custom notification with proper message
                notifications.show({
                  title: t("Cover image added"),
                  message: t("The cover image has been set successfully"),
                  color: "green",
                  autoClose: 3000,
                });
                refetch();
              },
            }
          );
        }
      } else {
        throw new Error("Invalid response format from server");
      }

      handleModalClose();
    } catch (error) {
      // Error notification - update the existing toast
      notifications.update({
        id: toastId,
        color: "red",
        title: t("Upload failed"),
        message:
          error?.response?.data?.message ||
          t("There was a problem uploading your image"),
        loading: false,
        autoClose: 3000,
      });
      console.error("Error uploading file:", error);
    } finally {
      // Reset the upload state regardless of success or failure
      setIsUploadingCover(false);
    }
  };

  // Handle removing the cover image
  const handleRemoveCoverImage = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
    setCoverImageUrl(null);
    setCoverImageFile(null);

    // Save the change to the database
    if (task) {
      updateTaskMutation.mutate(
        {
          taskId: task.id,
          coverImage: null,
        },
        {
          onSuccess: () => {
            // Remove from localStorage
            localStorage.removeItem(`task-cover-${task.id}`);
            // Custom notification with proper message
            notifications.show({
              title: t("Cover image removed"),
              message: t("The cover image has been removed successfully"),
              color: "green",
              autoClose: 3000,
            });
            refetch();
          },
        }
      );
    }
  };

  if (isLoading || !task) {
    // Loading state
    return (
      <Drawer
        opened={opened}
        onClose={onClose}
        position="right"
        size="xl"
        styles={{
          header: {
            margin: 0,
            padding: 0,
          },
          body: {
            padding: 0,
          },
        }}
      >
        {isLoading ? (
          <Center h="100%">
            <Text>Loading task...</Text>
          </Center>
        ) : (
          <>
            <Box
              p="md"
              style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
            >
              <Flex justify="space-between" align="center">
                <Group gap="xs">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={onClose}
                    aria-label="Close drawer"
                  >
                    <IconX size={20} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Open page"
                    disabled
                  >
                    <IconExternalLink size={20} />
                  </ActionIcon>
                </Group>
                <Group gap="xs">
                  <ActionIcon variant="subtle" color="gray" aria-label="Share">
                    <IconShare size={20} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Comments"
                  >
                    <IconMessageCircle size={20} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Add to favorites"
                  >
                    <IconStar size={20} />
                  </ActionIcon>
                  <Menu position="bottom-end">
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label="More options"
                      >
                        <IconDotsVertical size={20} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconLock size={16} />}>
                        Lock page
                      </Menu.Item>
                      <Menu.Item leftSection={<IconLink size={16} />}>
                        Copy link
                      </Menu.Item>
                      <Menu.Item leftSection={<IconCopy size={16} />}>
                        Duplicate
                      </Menu.Item>
                      <Menu.Item leftSection={<IconArrowRight size={16} />}>
                        Move to
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item leftSection={<IconFileImport size={16} />}>
                        Import
                      </Menu.Item>
                      <Menu.Item leftSection={<IconFileExport size={16} />}>
                        Export
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={16} />}
                        color="red"
                      >
                        Move to trash
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Flex>
            </Box>
          </>
        )}
      </Drawer>
    );
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="xl"
      title={
        <Box
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Group gap="xs">
            <Tooltip label={t("Close")}>
              <ActionIcon variant="subtle" onClick={onClose} aria-label="Close">
                <IconChevronRight size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("Open page")}>
              <ActionIcon
                variant="subtle"
                onClick={handleOpenPage}
                aria-label="Open page"
              >
                <IconExternalLink size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Group gap="xs">
            <Tooltip label={t("Share")}>
              <ActionIcon variant="subtle" aria-label="Share">
                <IconShare size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("View all comments")}>
              <ActionIcon variant="subtle" aria-label="View comments">
                <IconMessageCircle size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip
              label={
                isFavorited ? t("Remove from favorites") : t("Add to favorites")
              }
            >
              <ActionIcon
                variant="subtle"
                aria-label="Favorite"
                onClick={() => setIsFavorited(!isFavorited)}
              >
                {isFavorited ? (
                  <IconStarFilled size={18} />
                ) : (
                  <IconStar size={18} />
                )}
              </ActionIcon>
            </Tooltip>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Tooltip label={t("More options")}>
                  <ActionIcon variant="subtle" aria-label="More options">
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  {wordCount} {t("words")}
                </Menu.Label>
                <Menu.Item
                  leftSection={<IconLock size={16} />}
                  onClick={() => setIsLocked(!isLocked)}
                >
                  {isLocked ? t("Unlock page") : t("Lock page")}
                </Menu.Item>
                <Menu.Item leftSection={<IconCopy size={16} />}>
                  {t("Copy link")}
                </Menu.Item>
                <Menu.Item leftSection={<IconCopyPlus size={16} />}>
                  {t("Duplicate")}
                </Menu.Item>
                <Menu.Item leftSection={<IconArrowRight size={16} />}>
                  {t("Move to")}
                </Menu.Item>
                <Menu.Item leftSection={<IconFileImport size={16} />}>
                  {t("Import")}
                </Menu.Item>
                <Menu.Item leftSection={<IconFileExport size={16} />}>
                  {t("Export")}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={16} />}>
                  {t("Move to trash")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Box>
      }
      styles={{
        header: {
          margin: 0,
          padding: "1rem",
          borderBottom: `1px solid ${colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          backgroundColor:
            colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
        },
        title: {
          display: "contents",
          width: "100%",
          margin: 0,
          padding: 0,
        },
        body: {
          padding: 0,
          backgroundColor:
            colorScheme === "dark" ? theme.colors.dark[8] : theme.colors.gray[0],
        },
        root: {
          "& .add-cover-button": {
            border: "none !important",
            outline: "none !important",
            boxShadow: "none !important",
            backgroundColor: "transparent !important",
            "--button-bd": "none !important",
            "--button-shadow": "none !important",
          },
        },
      }}
      closeButtonProps={{ display: "none" }}
      className="task-drawer-component"
    >
      {task && (
        <Box p="md" pb={lastEditedBy || lastEditedAt ? 120 : 24}>
          <Stack gap="lg">
            {/* Top actions bar - empty when not needed */}
            <Group justify="apart">
              <Group></Group>
            </Group>

            {/* Cover image (conditionally rendered) */}
            {coverImageUrl && (
              <Box pos="relative">
                <Image
                  src={coverImageUrl}
                  alt={task.title}
                  height={150}
                  radius="md"
                  fit="cover"
                />
                <Group
                  justify="flex-end"
                  style={{ position: "absolute", top: 10, right: 10 }}
                >
                  <ActionIcon
                    variant="filled"
                    color="dark"
                    radius="xl"
                    onClick={openCoverModal}
                    title={t("Change Cover")}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="filled"
                    color="red"
                    radius="xl"
                    onClick={handleRemoveCoverImage}
                    title={t("Remove Cover")}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              </Box>
            )}

            {/* Emoji picker row - includes Add Cover when no cover exists */}
            <Group align="center">
              {/* Emoji picker */}
              <Box
                className="emoji-picker-container"
                style={{
                  position: "relative",
                  padding: "8px 0",
                }}
                onMouseEnter={() => setIsHoveringEmoji(true)}
                onMouseLeave={() => setIsHoveringEmoji(false)}
              >
                {task.icon ? (
                  <span style={{ fontSize: "24px", marginLeft: "8px" }}>
                    {task.icon}
                  </span>
                ) : null}

                <span
                  className="emoji-picker-button"
                  onClick={handleEmojiPickerClick}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "30px",
                    height: "30px",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    borderRadius: "4px",
                    color: "var(--mantine-color-electricBlue-light-color)",
                    opacity: task.icon && !isHoveringEmoji ? 0 : 1,
                    position: task.icon ? "absolute" : "relative",
                    left: task.icon ? "8px" : "auto",
                    top: task.icon ? "8px" : "auto",
                    transition: "opacity 0.2s ease-in-out",
                  }}
                >
                  <IconMoodSmile
                    size={20}
                    color="var(--mantine-color-electricBlue-light-color)"
                  />
                </span>
              </Box>

              {/* Add Cover button - only shown when no cover exists */}
              {!coverImageUrl && (
                <span
                  onClick={openCoverModal}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    padding: "4px 6px",
                    borderRadius: "4px",
                    gap: "4px",
                    color: "var(--mantine-color-electricBlue-light-color)",
                  }}
                >
                  <IconPhoto
                    size={16}
                    color="var(--mantine-color-electricBlue-light-color)"
                  />
                  <span style={{ fontSize: theme.fontSizes.sm }}>
                    {t("Add Cover")}
                  </span>
                </span>
              )}
            </Group>

            {/* Cover Image Modal */}
            <Modal
              opened={coverModalOpened}
              onClose={handleModalClose}
              title={t("Cover Image")}
            >
              <Stack>
                <Text size="sm" fw={500}>
                  {t("Upload from your device:")}
                </Text>
                <FileInput
                  placeholder={t("Select image file")}
                  accept="image/*"
                  onChange={handleFileUpload}
                  clearable
                />

                {coverImageFile && (
                  <Text size="xs" c="dimmed">
                    {coverImageFile.name} (
                    {Math.round(coverImageFile.size / 1024)} KB)
                  </Text>
                )}

                <Divider label={t("OR")} labelPosition="center" my="xs" />

                <Text size="sm" fw={500}>
                  {t("Enter image URL:")}
                </Text>
                <TextInput
                  placeholder="https://example.com/image.jpg"
                  value={coverImageUrl || ""}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                />

                {/* Preview section */}
                {(coverImageUrl || coverImageFile) && (
                  <Box>
                    <Text size="sm" fw={500}>
                      {t("Preview:")}
                    </Text>
                    <Image
                      src={coverImageUrl}
                      height={150}
                      fit="contain"
                      my="xs"
                      radius="sm"
                      onError={() => {
                        // Don't show error here, we'll handle it when they click Add cover
                      }}
                    />
                  </Box>
                )}

                <Group justify="space-between">
                  <Button
                    variant="outline"
                    onClick={handleModalClose}
                    disabled={isUploadingCover}
                  >
                    {t("Cancel")}
                  </Button>
                  <Button
                    onClick={() => {
                      if (coverImageFile) {
                        uploadFileToServer(coverImageFile);
                      } else if (coverImageUrl) {
                        processImageUrl(coverImageUrl);
                      } else {
                        handleModalClose();
                      }
                    }}
                    disabled={
                      isUploadingCover || (!coverImageFile && !coverImageUrl)
                    }
                    loading={isUploadingCover}
                  >
                    {isUploadingCover ? t("Uploading...") : t("Add cover")}
                  </Button>
                </Group>
              </Stack>
            </Modal>

            {/* Emoji Picker Modal */}
            <Modal
              opened={emojiPickerOpened}
              onClose={closeEmojiPicker}
              title={t("Select Emoji")}
              size="sm"
              centered
            >
              <Suspense
                fallback={
                  <Center p="xl">
                    <Text>{t("Loading emoji picker...")}</Text>
                  </Center>
                }
              >
                <div style={{ position: "relative" }}>
                  <Picker
                    data={async () =>
                      (await import("@emoji-mart/data")).default
                    }
                    onEmojiSelect={handleEmojiSelect}
                    perLine={8}
                    theme={colorScheme}
                  />
                  <Button
                    variant="default"
                    size="xs"
                    style={{
                      position: "absolute",
                      zIndex: 2,
                      bottom: "1rem",
                      right: "1rem",
                    }}
                    onClick={handleRemoveEmoji}
                  >
                    {t("Remove")}
                  </Button>
                </div>
              </Suspense>
            </Modal>

            {/* Task title */}
            <div>
              {isEditingTitle ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                >
                  <TextInput
                    size="xl"
                    placeholder={t("Task title")}
                    {...form.getInputProps("title")}
                    autoFocus
                    onBlur={() => {
                      // Ensure form is submitted on blur
                      handleSubmit();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSubmit();
                      } else if (e.key === "Escape") {
                        form.setFieldValue("title", task.title);
                        setIsEditingTitle(false);
                      }
                    }}
                  />
                </form>
              ) : (
                <Group align="center">
                  <Title
                    order={2}
                    style={{ cursor: "pointer" }}
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {task.title}
                  </Title>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    <IconEdit size={18} />
                  </ActionIcon>
                </Group>
              )}
            </div>

            {/* Task properties - Header styled like the project header */}
            <Stack gap="sm">
              {/* Properties section with similar styling to project header */}
              <Box style={propertyRowStyle}>
                <Text fw={500} size="sm" style={{ width: propertyLabelWidth }}>
                  {t("Status")}
                </Text>
                <Select
                  data={STATUS_OPTIONS}
                  value={task.status}
                  onChange={handleStatusChange}
                  size="sm"
                  styles={propertyInputStyles}
                  style={propertyControlStyle}
                />
              </Box>

              <Box style={propertyRowStyle}>
                <Text fw={500} size="sm" style={{ width: propertyLabelWidth }}>
                  {t("Priority")}
                </Text>
                <Select
                  data={PRIORITY_OPTIONS}
                  value={task.priority}
                  onChange={handlePriorityChange}
                  size="sm"
                  styles={propertyInputStyles}
                  style={propertyControlStyle}
                />
              </Box>

              <Box style={propertyRowStyle}>
                <Text fw={500} size="sm" style={{ width: propertyLabelWidth }}>
                  {t("Due Date")}
                </Text>
                <DateInput
                  value={form.values.dueDate}
                  onChange={(date) => {
                    form.setFieldValue("dueDate", date);
                    if (!task) return;
                    updateTaskMutation.mutate(
                      {
                        taskId: task.id,
                        dueDate: date,
                      },
                      {
                        onSuccess: () => refetch(),
                      }
                    );
                  }}
                  placeholder={t("Set due date")}
                  clearable
                  valueFormat="MMM DD, YYYY"
                  size="sm"
                  styles={propertyInputStyles}
                  style={propertyControlStyle}
                />
              </Box>

              <Box style={propertyRowStyle}>
                <Text fw={500} size="sm" style={{ width: propertyLabelWidth }}>
                  {t("Assignee")}
                </Text>
                <Flex style={propertyControlStyle} align="center" gap="xs">
                  <UserSelect
                    value={assigneeId}
                    onChange={handleAssigneeChange}
                    placeholder={t("Assign to...")}
                    styles={{
                      ...propertyInputStyles,
                    }}
                    style={{ flex: 1 }}
                  />
                  {assigneeId && (
                    <ActionIcon
                      size="xs"
                      onClick={clearAssignee}
                      color="gray"
                      variant="subtle"
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  )}
                </Flex>
              </Box>

              <Box style={propertyRowTopAlignStyle}>
                <Text fw={500} size="sm" style={{ width: propertyLabelWidth }}>
                  {t("Goals")}
                </Text>
                <Box
                  style={{
                    ...propertyControlStyle,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: theme.spacing.xs,
                  }}
                >
                  {taskGoalsQuery.isLoading ? (
                    <Text size="xs" c="dimmed">
                      {t("Loading...")}
                    </Text>
                  ) : taskGoals.length ? (
                    taskGoals.map((goal) => (
                      <Badge
                        key={goal.id}
                        size="sm"
                        radius="sm"
                        variant="light"
                        color={getGoalColor(goal.horizon)}
                      >
                        {goal.name}
                      </Badge>
                    ))
                  ) : (
                    <Text size="xs" c="dimmed">
                      {t("None")}
                    </Text>
                  )}
                </Box>
              </Box>

              <Box style={propertyRowTopAlignStyle}>
                <Text fw={500} size="sm" style={{ width: propertyLabelWidth }}>
                  {t("Entities")}
                </Text>
                <Box
                  style={{
                    ...propertyControlStyle,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: theme.spacing.xs,
                  }}
                >
                  {entityLinksQuery.isLoading ? (
                    <Text size="xs" c="dimmed">
                      {t("Loading...")}
                    </Text>
                  ) : taskEntityLinks.length ? (
                    taskEntityLinks.map((entity) => (
                      <Badge
                        key={entity.entityId}
                        size="sm"
                        radius="sm"
                        variant="light"
                        color="yellow"
                      >
                        {entity.entityName || "Entity"}
                      </Badge>
                    ))
                  ) : (
                    <Text size="xs" c="dimmed">
                      {t("None")}
                    </Text>
                  )}
                </Box>
              </Box>

              <Box style={propertyRowTopAlignStyle}>
                <Text fw={500} size="sm" style={{ width: propertyLabelWidth }}>
                  {t("Assign")}
                </Text>
                <MultiSelect
                  data={(allGoalsQuery.data || []).map((goal) => ({
                    value: goal.id,
                    label: goal.name,
                  }))}
                  value={assignedGoalIds}
                  onChange={(values) => {
                    if (!taskId) return;
                    const next = values as string[];
                    const added = next.filter(
                      (goalId) => !assignedGoalIds.includes(goalId),
                    );
                    const removed = assignedGoalIds.filter(
                      (goalId) => !next.includes(goalId),
                    );

                    added.forEach((goalId) =>
                      assignGoalMutation.mutate(goalId),
                    );
                    removed.forEach((goalId) =>
                      unassignGoalMutation.mutate(goalId),
                    );

                    setAssignedGoalIds(next);
                  }}
                  placeholder={t("Assign goals...")}
                  searchable
                  clearable
                  size="sm"
                  styles={propertyInputStyles}
                  style={propertyControlStyle}
                />
              </Box>

              <Box style={propertyRowTopAlignStyle}>
                <Text fw={500} size="sm" style={{ width: propertyLabelWidth }}>
                  {t("Labels")}
                </Text>
                <Group gap="xs" align="flex-start" style={propertyControlStyle}>
                  <MultiSelect
                    data={labelOptions}
                    value={selectedLabelIds}
                    onChange={(values) => {
                      if (!taskId) return;
                      const next = values as string[];
                      const added = next.filter(
                        (labelId) => !selectedLabelIds.includes(labelId),
                      );
                      const removed = selectedLabelIds.filter(
                        (labelId) => !next.includes(labelId),
                      );

                      added.forEach((labelId) =>
                        assignLabelMutation.mutate({ taskId, labelId }),
                      );
                      removed.forEach((labelId) =>
                        removeLabelMutation.mutate({ taskId, labelId }),
                      );
                    }}
                    placeholder={t("Assign labels...")}
                    searchable
                    clearable
                    size="sm"
                    styles={propertyInputStyles}
                    style={{ flex: 1 }}
                  />
                  <Tooltip label={t("Manage labels")}>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => setLabelManagerOpen(true)}
                      aria-label={t("Manage labels")}
                    >
                      <IconSettings size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Box>

              <Box style={propertyRowStyle}>
                <Text fw={500} size="sm" style={{ width: propertyLabelWidth }}>
                  {t("Bucket")}
                </Text>
                <Select
                  data={[
                    { value: "none", label: t("None") },
                    { value: "waiting", label: t("Waiting") },
                    { value: "someday", label: t("Someday") },
                  ]}
                  value={bucketValue || "none"}
                  onChange={(value) => {
                    if (!task) return;
                    updateTaskMutation.mutate({
                      taskId: task.id,
                      bucket: (value || "none") as TaskBucket,
                    });
                  }}
                  size="sm"
                  styles={propertyInputStyles}
                  style={propertyControlStyle}
                />
              </Box>

              <UnstyledButton
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                  color:
                    colorScheme === "dark"
                      ? theme.colors.dark[0]
                      : theme.colors.gray[6],
                  fontSize: theme.fontSizes.sm,
                }}
              >
                <IconPlus size={14} />
                {t("Add a property")}
              </UnstyledButton>
            </Stack>

            <Modal
              opened={labelManagerOpen}
              onClose={() => setLabelManagerOpen(false)}
              title={t("Manage labels")}
              size="md"
            >
              <Stack gap="sm">
                {labelDrafts.length ? (
                  labelDrafts.map((label) => {
                    const original = taskLabels.find(
                      (item: Label) => item.id === label.id,
                    );
                    const hasChanges =
                      original?.name !== label.name ||
                      original?.color !== label.color;

                    return (
                      <Group key={label.id} align="flex-end">
                        <TextInput
                          label={t("Name")}
                          value={label.name}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setLabelDrafts((current) =>
                              current.map((item) =>
                                item.id === label.id
                                  ? { ...item, name: value }
                                  : item,
                              ),
                            );
                          }}
                          style={{ flex: 1 }}
                        />
                        <Select
                          label={t("Color")}
                          data={labelColorOptions}
                          value={label.color}
                          onChange={(value) => {
                            const color = (value ||
                              label.color) as LabelColor;
                            setLabelDrafts((current) =>
                              current.map((item) =>
                                item.id === label.id
                                  ? { ...item, color }
                                  : item,
                              ),
                            );
                          }}
                          style={{ width: 140 }}
                        />
                        <Button
                          size="xs"
                          variant="light"
                          disabled={!hasChanges}
                          onClick={() =>
                            updateLabelMutation.mutate({
                              labelId: label.id,
                              name: label.name,
                              color: label.color,
                            })
                          }
                        >
                          {t("Save")}
                        </Button>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => deleteLabelMutation.mutate(label.id)}
                          aria-label={t("Delete label")}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    );
                  })
                ) : (
                  <Text size="sm" c="dimmed">
                    {t("No labels yet")}
                  </Text>
                )}

                <Divider />

                <Group align="flex-end">
                  <TextInput
                    label={t("New label")}
                    value={newLabelName}
                    onChange={(event) =>
                      setNewLabelName(event.currentTarget.value)
                    }
                    placeholder={t("Label name")}
                    style={{ flex: 1 }}
                  />
                  <Select
                    label={t("Color")}
                    data={labelColorOptions}
                    value={newLabelColor}
                    onChange={(value) =>
                      setNewLabelColor(
                        (value as LabelColor) || newLabelColor,
                      )
                    }
                    style={{ width: 140 }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!newLabelName.trim() || !workspaceId) return;
                      createLabelMutation.mutate(
                        {
                          name: newLabelName.trim(),
                          color: newLabelColor,
                          workspaceId,
                        },
                        {
                          onSuccess: () => {
                            setNewLabelName("");
                            setNewLabelColor("blue");
                          },
                        },
                      );
                    }}
                  >
                    {t("Create")}
                  </Button>
                </Group>
              </Stack>
            </Modal>

            <Stack gap="sm" mt="md">
              {/* Comments Section */}
              <Box>
                <Text size="sm" fw={500} mb="xs">
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
                                        comment.content
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
                                      deleteCommentMutation.mutate(
                                        comment.id
                                      )
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
                                setEditingCommentValue(
                                  event.currentTarget.value
                                )
                              }
                              minRows={2}
                              styles={textareaStyles}
                            />
                              <Group gap="xs" mt="xs">
                                <Button
                                  size="xs"
                                  onClick={() =>
                                    handleSaveEditComment(comment.id)
                                  }
                                >
                                  {t("Save")}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  onClick={handleCancelEditComment}
                                >
                                  {t("Cancel")}
                                </Button>
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
                      styles={{
                        input: {
                          backgroundColor: surfaceColor,
                          border: panelBorder,
                        },
                      }}
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
              {/* Main Content Editor Section */}
              <Box pt="md">
                {task.pageId ? (
                  <Box>
                    {pageQuery.isLoading ? (
                      <Text size="sm" color="dimmed">
                        {t("Loading content...")}
                      </Text>
                    ) : (
                      <PageEditor
                        pageId={task.pageId}
                        editable
                        content={pageQuery.data?.content}
                      />
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Text mb="md" size="sm" color="dimmed">
                      {t("Type '/' for commands")}
                    </Text>
                    <Box
                      style={{
                        cursor: "text",
                        padding: theme.spacing.sm,
                        minHeight: "200px",
                        borderRadius: theme.radius.sm,
                        border: panelBorder,
                        backgroundColor: panelMuted,
                      }}
                      onClick={handleCreatePageForTask}
                    >
                      <Text size="sm">{t("Click to add content")}</Text>
                    </Box>
                  </Box>
                )}
              </Box>
            </Stack>
          </Stack>

          {/* Footer with metadata */}
          {(lastEditedBy || lastEditedAt) && (
            <Box
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                padding: theme.spacing.md,
                backgroundColor:
                  colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
                boxShadow:
                  colorScheme === "dark"
                    ? "0 -6px 12px rgba(0, 0, 0, 0.35)"
                    : "0 -6px 12px rgba(0, 0, 0, 0.08)",
              }}
            >
              <Group justify="flex-end">
                <Group gap="xs">
                  {lastEditedBy && (
                    <Group gap={4}>
                      <CustomAvatar
                        radius="xl"
                        size="xs"
                        avatarUrl={null}
                        name={lastEditedBy}
                      />
                      <Text size="sm" color="dimmed">
                        {lastEditedBy}
                      </Text>
                    </Group>
                  )}
                  {lastEditedAt && (
                    <Text size="sm" color="dimmed">
                      {t("edited")}{" "}
                      {formatDistanceToNow(lastEditedAt, { addSuffix: true })}
                    </Text>
                  )}
                </Group>
              </Group>
            </Box>
          )}
        </Box>
      )}
    </Drawer>
  );
}
