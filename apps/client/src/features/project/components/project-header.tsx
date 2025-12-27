import { useState, useRef, useEffect } from "react";
import {
  Box,
  Group,
  Title,
  Text,
  Stack,
  Paper,
  Button,
  Flex,
  Badge,
  ActionIcon,
  Image,
  TextInput,
  Textarea,
  Avatar,
  Menu,
  Select,
  MultiSelect,
  Popover,
  Indicator,
  Grid,
  Modal,
  Divider,
  ColorPicker,
  Rating,
  Tooltip,
  useMantineTheme,
  FileInput,
  Checkbox,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCalendar,
  IconEdit,
  IconPhoto,
  IconPlus,
  IconTags,
  IconUsers,
  IconX,
  IconBrandGithub,
  IconFlag,
  IconSubtask,
  IconFolder,
  IconChevronDown,
  IconCheck,
  IconDotsVertical,
  IconPaperclip,
  IconAt,
  IconSend,
  IconDots,
  IconGripVertical,
  IconChevronRight,
  IconCopy,
  IconTrash,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { Label, Project, TaskPriority } from "../types";
import { useTranslation } from "react-i18next";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  useUpdateProjectMutation,
  useSilentUpdateProjectMutation,
} from "../hooks/use-projects";
import { useWorkspaceUsers } from "@/features/user/hooks/use-workspace-users";
import { useTaskLabels } from "@/features/project/hooks/use-task-labels";
import { CustomAvatar } from "@/components/ui/custom-avatar.tsx";
import { useAtom } from "jotai";
import { currentUserAtom } from "@/features/user/atoms/current-user-atom.ts";
import api from "@/lib/api-client.ts";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// Check if we're in development mode
const isDevelopment = import.meta.env?.DEV;

// Only log in production or if explicitly enabled
const shouldLog =
  !isDevelopment || import.meta.env?.VITE_ENABLE_LOGS === "true";

// Helper function to conditionally log
const conditionalLog = (message: string, data?: any) => {
  if (shouldLog) {
    console.log(message, data);
  }
};

// Helper function to conditionally log errors
const conditionalErrorLog = (message: string, error?: any) => {
  if (shouldLog || error?.response?.status >= 400) {
    console.error(message, error);
  }
};

interface ProjectHeaderProps {
  project: Project;
  onBack?: () => void;
}

// Define priority options
const priorityOptions = [
  { value: "low", label: "Low", color: "gray" },
  { value: "medium", label: "Medium", color: "blue" },
  { value: "high", label: "High", color: "orange" },
  { value: "urgent", label: "Urgent", color: "red" },
];

 

export function ProjectHeader({ project, onBack }: ProjectHeaderProps) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [title, setTitle] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [startDate, setStartDate] = useState<Date | null>(
    project.startDate ? new Date(project.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    project.endDate ? new Date(project.endDate) : null
  );
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    project.coverImage || null
  );
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Track which properties are visible
  const [visibleProperties, setVisibleProperties] = useState({
    timeline: true,
    priority: true,
    members: true,
    tags: true,
  });

  // Track if we're showing hidden properties
  const [showAllProperties, setShowAllProperties] = useState(false);

  // Functions to save/load property configuration
  const getStorageKey = (key: string) => `project_${project.id}_${key}`;

  const savePropertyOrder = (order: any[]) => {
    localStorage.setItem(getStorageKey("propertyOrder"), JSON.stringify(order));
  };

  const saveVisibleProperties = (visible: Record<string, boolean>) => {
    localStorage.setItem(
      getStorageKey("visibleProperties"),
      JSON.stringify(visible)
    );
  };

  const saveCustomProperties = (properties: any[]) => {
    localStorage.setItem(
      getStorageKey("customProperties"),
      JSON.stringify(properties)
    );
  };

  const loadPropertyOrder = () => {
    // First check if we have metadata from the server
    if (
      project.metadata?.propertyOrder &&
      Array.isArray(project.metadata.propertyOrder)
    ) {
      return project.metadata.propertyOrder;
    }

    // Then check localStorage
    const saved = localStorage.getItem(getStorageKey("propertyOrder"));
    return saved
      ? JSON.parse(saved)
      : [
          { id: "timeline", name: "Timeline", type: "builtin" },
          { id: "priority", name: "Priority", type: "builtin" },
          { id: "members", name: "Members", type: "builtin" },
          { id: "tags", name: "Tags", type: "builtin" },
        ];
  };

  const loadVisibleProperties = () => {
    // First check if we have metadata from the server
    if (project.metadata?.visibleProperties) {
      return project.metadata.visibleProperties;
    }

    // Then check localStorage
    const saved = localStorage.getItem(getStorageKey("visibleProperties"));
    return saved
      ? JSON.parse(saved)
      : {
          timeline: true,
          priority: true,
          members: true,
          tags: true,
        };
  };

  const loadCustomProperties = () => {
    // First check if we have metadata from the server
    if (
      project.metadata?.customProperties &&
      Array.isArray(project.metadata.customProperties)
    ) {
      return project.metadata.customProperties;
    }

    // Then check localStorage
    const saved = localStorage.getItem(getStorageKey("customProperties"));
    return saved ? JSON.parse(saved) : [];
  };

  // Track property order
  const [propertyOrder, setPropertyOrder] = useState(loadPropertyOrder());

  // State for custom properties
  const [customProperties, setCustomProperties] = useState<
    Array<{
      id: string;
      name: string;
      value: string;
      isVisible: boolean;
    }>
  >(loadCustomProperties());

  // Load saved preferences on mount
  useEffect(() => {
    // Initialize from local storage if available
    setVisibleProperties(loadVisibleProperties());
  }, [project.id]);

  // Save changes when they occur
  useEffect(() => {
    saveVisibleProperties(visibleProperties);
  }, [visibleProperties]);

  useEffect(() => {
    saveCustomProperties(customProperties);
  }, [customProperties]);

  useEffect(() => {
    savePropertyOrder(propertyOrder);
  }, [propertyOrder]);

  // State for property management modal
  const [propertiesModalOpened, setPropertiesModalOpened] = useState(false);

  const [opened, { open, close }] = useDisclosure(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Mutations
  const updateProjectMutation = useUpdateProjectMutation();
  const silentUpdateProjectMutation = useSilentUpdateProjectMutation();

  // Get workspace users
  const { data: workspaceUsers = [] } = useWorkspaceUsers({
    workspaceId: project.workspaceId,
  });

  const { data: taskLabels = [] } = useTaskLabels();

  // Ensure workspaceUsers is an array by checking for pagination structure
  const users = Array.isArray(workspaceUsers)
    ? workspaceUsers
    : workspaceUsers &&
        typeof workspaceUsers === "object" &&
        "data" in workspaceUsers
      ? workspaceUsers.data
      : [];

  // Type assertion to help TypeScript understand the structure
  const typedUsers = users as Array<{
    id: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
  }>;

  const labels: Label[] = Array.isArray(taskLabels) ? taskLabels : [];

  // Helper to update project (with notifications)
  const updateProject = (data: any) => {
    conditionalLog("Updating project with data:", data);
    // Log the full project details including the ID
    console.log("Project details for debugging:", {
      projectId: project.id,
      projectName: project.name,
      fullProject: project,
      updateData: data,
    });

    updateProjectMutation.mutate(
      {
        projectId: project.id,
        ...data,
      },
      {
        onSuccess: (updatedProject) => {
          conditionalLog("Project updated successfully:", updatedProject);
          notifications.show({
            title: t("Project updated"),
            message: t("The project has been updated successfully"),
            color: "green",
          });
        },
        onError: (error) => {
          conditionalErrorLog("Error updating project:", error);
          notifications.show({
            title: t("Error"),
            message: t("Failed to update project"),
            color: "red",
          });
        },
      }
    );
  };

  // Helper to update project silently (without notifications)
  const updateProjectSilently = (data: any) => {
    conditionalLog("Silently updating project with data:", data);

    // Use the silent mutation hook instead of the regular one
    silentUpdateProjectMutation.mutate({
      projectId: project.id,
      ...data,
    });
  };

  // Handle title update
  const handleTitleUpdate = () => {
    conditionalLog("Title update triggered - current title:", {
      title,
      projectName: project.name,
    });
    if (title !== project.name) {
      updateProject({ name: title });
    }
    setIsEditingTitle(false);
  };

  // Handle description update
  const handleDescriptionUpdate = () => {
    if (description !== project.description) {
      updateProject({ description });
    }
    setIsEditingDescription(false);
  };

  // Handle dates update
  const handleDatesUpdate = () => {
    updateProject({
      startDate: startDate,
      endDate: endDate,
    });
  };

  // Focus the input when editing starts
  const focusInput = (
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        if ("select" in ref.current) {
          ref.current.select();
        }
      }
    }, 0);
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
        updateProject({ coverImage: url });

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
        close();
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

  // Clean up when modal closes
  const handleModalClose = () => {
    // Only revoke if we're not using the image
    if (objectUrl && !coverImageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
    close();
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
      if (!project.spaceId) {
        console.error("Missing spaceId for project:", project);
        throw new Error("Space ID is required for image upload");
      }

      console.log("Uploading cover image with spaceId:", project.spaceId);

      // Create a FormData instance
      const formData = new FormData();

      // Order matters! Add non-file fields first
      formData.append("type", "project-cover");
      formData.append("spaceId", project.spaceId);

      // Add file last for FastifyMultipart to parse correctly
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

      console.log("Upload response:", JSON.stringify(response, null, 2));

      // Success notification - update the existing toast
      notifications.update({
        id: toastId,
        color: "green",
        title: t("Upload complete"),
        message: t("The image has been uploaded successfully"),
        icon: <IconCheck size={16} />,
        loading: false,
        autoClose: 3000,
      });

      // Get the URL from the response
      // The response should include an attachment object with information to construct the URL
      if (response && typeof response === "object") {
        // Construct a direct URL to the image based on the response
        let imageUrl;

        if ("fileName" in response) {
          // Use the standardized path format based on attachment type
          imageUrl = `/api/attachments/img/project-cover/${response.fileName}`;
          console.log("Using constructed image URL:", imageUrl);
        } else if ("filePath" in response) {
          // If we have a full file path, use it directly
          imageUrl = `/api/attachments/img/project-cover/${(response.filePath as string).split("/").pop()}`;
          console.log("Using file path-based URL:", imageUrl);
        } else {
          console.error("Invalid response format from image upload:", response);
          throw new Error("Invalid response format from server");
        }

        // Wait a moment before updating the cover image to avoid conflicts
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Only update if we actually have a valid URL
        if (imageUrl) {
          // We need to prevent the local object URL from being revoked
          // since we still want to display the image
          setObjectUrl(null);

          console.log("Updating cover image URL to:", imageUrl);
          setCoverImageUrl(imageUrl);

          // Update the project with the actual image URL from the server
          updateProject({ coverImage: imageUrl });
        }
      } else {
        console.error("Invalid response format from image upload:", response);
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
        icon: <IconX size={16} />,
        loading: false,
        autoClose: 3000,
      });
      console.error("Error uploading file:", error);
    } finally {
      // Reset the upload state regardless of success or failure
      setIsUploadingCover(false);
    }
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

      // Note: We don't upload immediately - that happens when the user clicks 'Add cover'
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

  // Handle removing the cover image
  const handleRemoveCoverImage = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
    setCoverImageUrl(null);
    setCoverImageFile(null);

    // Save the change to the database
    updateProject({ coverImage: null });

    // Success notification
    notifications.show({
      title: t("Cover image removed"),
      message: t("The cover image has been removed successfully"),
      color: "green",
    });
  };

  // Cleanup object URLs and toasts when component unmounts
  useEffect(() => {
    return () => {
      // Clean up object URLs
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      // Clean up any lingering toasts
      notifications.hide("upload-cover-image-toast");
      notifications.hide("validate-image-url-toast");
    };
  }, [objectUrl]);

  // Handle property reordering
  const handleDragEnd = (result: any) => {
    // Skip if no destination or if not dragging a property
    if (!result?.destination || result?.type !== "PROPERTY") return;

    const items = Array.from(propertyOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPropertyOrder(items);
    // Save to server for persistence across sessions/devices
    savePropertyConfigToServer();
  };

  // Toggle property visibility
  const togglePropertyVisibility = (property: string) => {
    if (propertyOrder.find((p) => p.id === property)?.type === "builtin") {
      setVisibleProperties((prev) => {
        const updated = {
          ...prev,
          [property]: !prev[property],
        };
        return updated;
      });
    } else {
      setCustomProperties((prev) => {
        const updated = prev.map((p) =>
          p.id === property ? { ...p, isVisible: !p.isVisible } : p
        );
        return updated;
      });
    }
    // Save changes to the server
    setTimeout(() => savePropertyConfigToServer(), 100);
  };

  // Save property configuration to the server
  const savePropertyConfigToServer = () => {
    // Create metadata object with property configuration
    const metadata = {
      ...(project.metadata || {}),
      propertyOrder,
      visibleProperties,
      customProperties,
    };

    // Update the project with the new metadata - silently without toast notifications
    silentUpdateProjectMutation.mutate(
      {
        projectId: project.id,
        metadata,
      },
      {
        onError: (error: any) => {
          // Only show notification for severe errors
          if (error?.response?.status >= 500) {
            notifications.show({
              title: t("Error"),
              message: t("Failed to save property configuration"),
              color: "red",
            });
          }
        },
      }
    );
  };

  // Add custom property
  const addCustomProperty = () => {
    const newProperty = {
      id: `custom-${Date.now()}`,
      name: "New Property",
      value: "",
      isVisible: true,
    };

    setCustomProperties((prev) => [...prev, newProperty]);
    setPropertyOrder((prev) => [
      ...prev,
      { id: newProperty.id, name: newProperty.name, type: "custom" },
    ]);

    // Save to server after state update
    setTimeout(() => savePropertyConfigToServer(), 100);
  };

  // Remove custom property
  const removeCustomProperty = (id: string) => {
    setCustomProperties((prev) => prev.filter((p) => p.id !== id));
    setPropertyOrder((prev) => prev.filter((p) => p.id !== id));

    // Save to server after state update
    setTimeout(() => savePropertyConfigToServer(), 100);
  };

  // Duplicate custom property
  const duplicateProperty = (id: string) => {
    const propToDuplicate = customProperties.find((p) => p.id === id);
    if (!propToDuplicate) return;

    const newProperty = {
      id: `custom-${Date.now()}`,
      name: `${propToDuplicate.name} copy`,
      value: propToDuplicate.value,
      isVisible: propToDuplicate.isVisible,
    };

    setCustomProperties((prev) => [...prev, newProperty]);
    setPropertyOrder((prev) => [
      ...prev,
      { id: newProperty.id, name: newProperty.name, type: "custom" },
    ]);

    // Save to server after state update
    setTimeout(() => savePropertyConfigToServer(), 100);
  };

  // Update custom property
  const updateCustomProperty = (
    id: string,
    field: "name" | "value",
    newValue: string
  ) => {
    setCustomProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: newValue } : p))
    );

    if (field === "name") {
      setPropertyOrder((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: newValue } : p))
      );
    }

    // Save to server after state update
    setTimeout(() => savePropertyConfigToServer(), 100);
  };

  const [currentUser] = useAtom(currentUserAtom);

  // Number of hidden properties
  const getHiddenPropertiesCount = () => {
    const hiddenBuiltIn = Object.entries(visibleProperties).filter(
      ([, visible]) => !visible
    ).length;
    const hiddenCustom = customProperties.filter(
      (prop) => !prop.isVisible
    ).length;
    return hiddenBuiltIn + hiddenCustom;
  };

  // Render a single property row
  const renderPropertyRow = (propertyId: string, index: number) => {
    const property = propertyOrder.find((p) => p.id === propertyId);
    if (!property) return null;

    // Check if property should be shown
    const isVisible =
      property.type === "builtin"
        ? visibleProperties[propertyId]
        : customProperties.find((p) => p.id === propertyId)?.isVisible;

    if (!isVisible && !showAllProperties) return null;

    // Use Draggable to enable drag and drop
    return (
      <Draggable draggableId={propertyId} index={index} key={propertyId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...provided.draggableProps.style,
              opacity: !isVisible ? 0.5 : 1,
              transition: snapshot.isDragging ? "all 0.01s" : "all 0.2s ease",
              background: snapshot.isDragging
                ? "rgba(0, 0, 0, 0.03)"
                : "transparent",
              borderRadius: theme.radius.sm,
              marginBottom: 8, // Consistent spacing between items
              ...(snapshot.isDragging && {
                boxShadow: theme.shadows.sm,
              }),
            }}
          >
            <Group
              align="center"
              mb={0}
              style={{ position: "relative", padding: "4px 8px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "grab",
                  marginRight: "8px",
                  opacity: snapshot.isDragging ? 0.8 : 0.5,
                  transition: "opacity 0.2s ease",
                }}
              >
                <IconGripVertical size={16} />
              </div>

              <Text fw={500} size="sm" style={{ width: "100px" }}>
                {property.name}
              </Text>

              {propertyId === "timeline" && (
                <Popover position="bottom" withArrow shadow="md">
                  <Popover.Target>
                    <Group gap="xs" style={{ cursor: "pointer" }}>
                      <Text size="sm" color={startDate ? "inherit" : "dimmed"}>
                        {startDate
                          ? startDate.toLocaleDateString()
                          : t("Set start date")}
                      </Text>
                      <Text size="sm"> - </Text>
                      <Text size="sm" color={endDate ? "inherit" : "dimmed"}>
                        {endDate
                          ? endDate.toLocaleDateString()
                          : t("Set due date")}
                      </Text>
                    </Group>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Stack>
                      <DateInput
                        value={startDate}
                        onChange={setStartDate}
                        label={t("Start date")}
                        placeholder={t("Pick start date")}
                        clearable
                      />
                      <DateInput
                        value={endDate}
                        onChange={setEndDate}
                        label={t("Due date")}
                        placeholder={t("Pick due date")}
                        clearable
                        minDate={startDate || undefined}
                      />
                      <Button
                        onClick={handleDatesUpdate}
                        fullWidth
                        disabled={
                          startDate ===
                            (project.startDate
                              ? new Date(project.startDate)
                              : null) &&
                          endDate ===
                            (project.endDate ? new Date(project.endDate) : null)
                        }
                      >
                        {t("Save")}
                      </Button>
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
              )}

              {propertyId === "priority" && (
                <Select
                  size="xs"
                  data={priorityOptions}
                  value={priority}
                  onChange={(value: TaskPriority) => setPriority(value)}
                  styles={{
                    input: {
                      border: "none",
                      padding: 0,
                      backgroundColor: "transparent",
                    },
                  }}
                />
              )}

              {propertyId === "members" && (
                <Popover position="bottom" withArrow shadow="md">
                  <Popover.Target>
                    <Group gap={-8} style={{ cursor: "pointer" }}>
                      {selectedMembers.length > 0 ? (
                        selectedMembers.slice(0, 3).map((memberId) => {
                          const user = typedUsers.find(
                            (u) => u.id === memberId
                          );
                          return (
                            <CustomAvatar
                              key={memberId}
                              avatarUrl={user?.avatarUrl}
                              name={user?.name || ""}
                              radius="xl"
                              size="sm"
                            />
                          );
                        })
                      ) : (
                        <Text size="sm" color="dimmed">
                          {t("Add members")}
                        </Text>
                      )}
                      {selectedMembers.length > 3 && (
                        <Avatar radius="xl" size="sm">
                          +{selectedMembers.length - 3}
                        </Avatar>
                      )}
                    </Group>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <MultiSelect
                      label={t("Project members")}
                      data={typedUsers.map((user) => ({
                        value: user.id,
                        label: user.name || user.email,
                      }))}
                      value={selectedMembers}
                      onChange={setSelectedMembers}
                      placeholder={t("Select members")}
                      searchable
                      clearable
                    />
                  </Popover.Dropdown>
                </Popover>
              )}

              {propertyId === "tags" && (
                <Popover position="bottom" withArrow shadow="md">
                  <Popover.Target>
                    <Group gap={5} style={{ cursor: "pointer" }}>
                      {selectedLabels.length > 0 ? (
                        selectedLabels.slice(0, 3).map((labelId) => {
                          const label = labels.find((l) => l.id === labelId);
                          return label ? (
                            <Badge key={labelId} color={label.color} size="sm">
                              {label.name}
                            </Badge>
                          ) : null;
                        })
                      ) : (
                        <Text size="sm" color="dimmed">
                          {t("Add tags")}
                        </Text>
                      )}
                      {selectedLabels.length > 3 && (
                        <Badge size="sm">+{selectedLabels.length - 3}</Badge>
                      )}
                    </Group>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <MultiSelect
                      label={t("Project tags")}
                      data={labels.map((label) => ({
                        value: label.id,
                        label: label.name,
                        group: "Existing Tags",
                      }))}
                      value={selectedLabels}
                      onChange={setSelectedLabels}
                      placeholder={t("Select tags")}
                      searchable
                      clearable
                    />
                  </Popover.Dropdown>
                </Popover>
              )}

              {property.type === "custom" && (
                <TextInput
                  value={
                    customProperties.find((p) => p.id === propertyId)?.value ||
                    ""
                  }
                  onChange={(e) =>
                    updateCustomProperty(propertyId, "value", e.target.value)
                  }
                  size="xs"
                  placeholder={t("Enter value")}
                  styles={{
                    input: {
                      border: "none",
                      padding: 0,
                      backgroundColor: "transparent",
                    },
                    root: {
                      width: "auto",
                      flex: 1,
                    },
                  }}
                />
              )}

              <Menu shadow="md" position="bottom-end">
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    style={{
                      opacity: 0.5,
                      position: "absolute",
                      right: 0,
                    }}
                  >
                    <IconDotsVertical size={16} />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>{property.name}</Menu.Label>
                  <Menu.Item leftSection={<IconEdit size={14} />}>
                    {t("Rename")}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconEdit size={14} />}>
                    {t("Edit property")}
                  </Menu.Item>

                  <Menu.Divider />

                  <Menu.Label>{t("Property visibility")}</Menu.Label>
                  <Menu.Item
                    leftSection={
                      isVisible ? (
                        <IconEyeOff size={14} />
                      ) : (
                        <IconEye size={14} />
                      )
                    }
                    onClick={() => togglePropertyVisibility(propertyId)}
                  >
                    {isVisible ? t("Always hide") : t("Always show")}
                  </Menu.Item>

                  <Menu.Divider />

                  {property.type === "custom" && (
                    <>
                      <Menu.Item
                        leftSection={<IconCopy size={14} />}
                        onClick={() => duplicateProperty(propertyId)}
                      >
                        {t("Duplicate property")}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => removeCustomProperty(propertyId)}
                      >
                        {t("Delete property")}
                      </Menu.Item>
                    </>
                  )}
                </Menu.Dropdown>
              </Menu>
            </Group>
          </div>
        )}
      </Draggable>
    );
  };

  // State for comments
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<
    Array<{
      id: string;
      content: string;
      createdAt: string;
      user?: {
        id: string;
        name?: string;
        avatarUrl?: string;
      };
    }>
  >([]);

  // Handle comment submission
  const handleCommentSubmit = () => {
    if (!newComment.trim()) return;

    // Add comment to local state
    const newCommentObj = {
      id: `comment-${Date.now()}`,
      content: newComment,
      createdAt: new Date().toISOString(),
      user: {
        id: currentUser?.user?.id || "unknown",
        name: currentUser?.user?.name || "Anonymous",
        avatarUrl: currentUser?.user?.avatarUrl,
      },
    };

    setComments([...comments, newCommentObj]);
    setNewComment("");

    // In a real implementation, you would send this to the server
    // For now, we'll just show a notification
    notifications.show({
      title: t("Comment added"),
      message: t("Your comment has been added"),
      color: "green",
    });
  };

  return (
    <Box mb="lg">
      {/* Cover image (if exists) */}
      {coverImageUrl && (
        <Box pos="relative" mb="md">
          <Image
            src={coverImageUrl}
            alt={project.name}
            height={200}
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
              onClick={open}
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

      {/* Project title */}
      <Group justify="space-between" mb="md">
        {isEditingTitle ? (
          <TextInput
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleUpdate}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleTitleUpdate();
              }
            }}
            placeholder={t("Project Title")}
            style={{ flex: 1 }}
            autoFocus
          />
        ) : (
          <Group>
            <Title order={1}>{project.name}</Title>
            <ActionIcon
              variant="subtle"
              onClick={() => {
                setIsEditingTitle(true);
                setTimeout(() => focusInput(titleInputRef), 100);
              }}
            >
              <IconEdit size={18} />
            </ActionIcon>
          </Group>
        )}

        {!coverImageUrl && (
          <Button
            variant="light"
            leftSection={<IconPhoto size={16} />}
            size="sm"
            onClick={open}
          >
            {t("Add Cover")}
          </Button>
        )}
      </Group>

      {/* Project description */}
      <Box mb="md">
        {isEditingDescription ? (
          <Textarea
            ref={descriptionInputRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionUpdate}
            placeholder={t("Add project description...")}
            autosize
            minRows={2}
            maxRows={6}
            style={{ width: "100%" }}
            autoFocus
          />
        ) : (
          <Group align="flex-start" wrap="nowrap">
            <Text
              color={description ? "inherit" : "dimmed"}
              onClick={() => {
                setIsEditingDescription(true);
                setTimeout(() => focusInput(descriptionInputRef), 100);
              }}
              style={{ flex: 1, cursor: "pointer" }}
            >
              {description || t("Add project description...")}
            </Text>
            <ActionIcon
              variant="subtle"
              onClick={() => {
                setIsEditingDescription(true);
                setTimeout(() => focusInput(descriptionInputRef), 100);
              }}
            >
              <IconEdit size={18} />
            </ActionIcon>
          </Group>
        )}
      </Box>

      {/* Project metadata */}
      <Stack mt="md" gap="md">
        {/* Property section with drag and drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="properties" type="PROPERTY">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{
                  marginBottom: 0,
                  minHeight: "50px",
                  transition: "background-color 0.2s ease",
                  background: snapshot.isDraggingOver
                    ? "rgba(0, 0, 0, 0.03)"
                    : "transparent",
                  borderRadius: theme.radius.md,
                  padding: snapshot.isDraggingOver ? 8 : 0,
                  boxShadow: snapshot.isDraggingOver
                    ? "inset 0 0 0 1px rgba(0, 0, 0, 0.06)"
                    : "none",
                }}
              >
                {propertyOrder.map((property, index) =>
                  renderPropertyRow(property.id, index)
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Property management buttons */}
        <Group mt={0} style={{ marginTop: -5 }}>
          {getHiddenPropertiesCount() > 0 && (
            <Button
              variant="subtle"
              leftSection={
                showAllProperties ? (
                  <IconChevronDown size={14} />
                ) : (
                  <IconChevronRight size={14} />
                )
              }
              onClick={() => setShowAllProperties(!showAllProperties)}
              size="xs"
              style={{
                border: "none",
                boxShadow: "none",
                padding: 0,
                backgroundColor: "transparent",
                marginTop: 0,
              }}
            >
              {showAllProperties
                ? t("Hide {{count}} properties", {
                    count: getHiddenPropertiesCount(),
                  })
                : t("Show {{count}} more properties", {
                    count: getHiddenPropertiesCount(),
                  })}
            </Button>
          )}

          <Button
            variant="subtle"
            leftSection={<IconPlus size={14} />}
            onClick={addCustomProperty}
            style={{
              border: "none",
              boxShadow: "none",
              padding: 0,
              backgroundColor: "transparent",
              marginTop: 0,
            }}
          >
            <Text size="sm" fw={500} style={{ marginTop: 0 }}>
              {t("Add a property")}
            </Text>
          </Button>
        </Group>

        {/* Comments Section */}
        <Box>
          {comments.length > 0 && (
            <Stack gap="xs" mb="md">
              {comments.map((comment) => (
                <Group
                  key={comment.id}
                  align="flex-start"
                  wrap="nowrap"
                  gap="sm"
                >
                  <CustomAvatar
                    radius="xl"
                    size="md"
                    avatarUrl={comment.user?.avatarUrl}
                    name={comment.user?.name || ""}
                  />
                  <Box style={{ flex: 1 }}>
                    <Group gap="xs">
                      <Text size="sm" fw={500}>
                        {comment.user?.name}
                      </Text>
                      <Text size="xs" color="dimmed">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </Text>
                    </Group>
                    <Text size="sm">{comment.content}</Text>
                  </Box>
                </Group>
              ))}
            </Stack>
          )}

          <Group align="flex-start" style={{ flexWrap: "nowrap" }}>
            {/* User Avatar */}
            <CustomAvatar
              radius="xl"
              size="md"
              avatarUrl={currentUser?.user?.avatarUrl}
              name={currentUser?.user?.name}
            />

            {/* Comment Input Area with inline buttons */}
            <Box style={{ flex: 1, position: "relative" }}>
              <Group align="flex-end" style={{ flexWrap: "nowrap" }}>
                <Textarea
                  placeholder={t("Add a comment...")}
                  minRows={2}
                  autosize
                  style={{ flex: 1 }}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  styles={{
                    input: {
                      border: "none",
                      "&:focus": {
                        borderColor: "transparent",
                      },
                    },
                    wrapper: {
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCommentSubmit();
                    }
                  }}
                />

                {/* Action Buttons - show when there's text or existing comments */}
                {(newComment.trim() || comments.length > 0) && (
                  <Group gap="xs" style={{ marginBottom: "8px" }}>
                    <Tooltip label={t("Attach files")}>
                      <ActionIcon color="gray">
                        <IconPaperclip size={18} />
                      </ActionIcon>
                    </Tooltip>

                    <Tooltip label={t("Mention someone")}>
                      <ActionIcon color="gray">
                        <IconAt size={18} />
                      </ActionIcon>
                    </Tooltip>

                    <Tooltip label={t("Submit")}>
                      <ActionIcon
                        color="blue"
                        variant="filled"
                        onClick={handleCommentSubmit}
                        disabled={!newComment.trim()}
                      >
                        <IconSend size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                )}
              </Group>
            </Box>
          </Group>
        </Box>

        {/* Divider between header and body content */}
        <Divider my="lg" />
      </Stack>

      {/* Properties Management Modal */}
      <Modal
        opened={propertiesModalOpened}
        onClose={() => setPropertiesModalOpened(false)}
        title={t("Manage Properties")}
      >
        <Stack gap="md">
          <Text size="sm">{t("Show or hide project properties:")}</Text>

          {/* Built-in properties */}
          <Stack gap="xs">
            <Checkbox
              label={t("Timeline")}
              checked={visibleProperties.timeline}
              onChange={() => togglePropertyVisibility("timeline")}
            />
            <Checkbox
              label={t("Priority")}
              checked={visibleProperties.priority}
              onChange={() => togglePropertyVisibility("priority")}
            />
            <Checkbox
              label={t("Members")}
              checked={visibleProperties.members}
              onChange={() => togglePropertyVisibility("members")}
            />
            <Checkbox
              label={t("Tags")}
              checked={visibleProperties.tags}
              onChange={() => togglePropertyVisibility("tags")}
            />
          </Stack>

          <Divider label={t("Custom Properties")} labelPosition="center" />

          {/* Custom properties list */}
          {customProperties.length > 0 ? (
            <Stack gap="sm">
              {customProperties.map((prop) => (
                <Group key={prop.id} justify="space-between">
                  <TextInput
                    value={prop.name}
                    onChange={(e) =>
                      updateCustomProperty(prop.id, "name", e.target.value)
                    }
                    size="sm"
                    placeholder={t("Property name")}
                    style={{ flex: 1 }}
                  />
                  <ActionIcon
                    color="red"
                    onClick={() => removeCustomProperty(prop.id)}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text color="dimmed" size="sm" ta="center">
              {t("No custom properties added yet")}
            </Text>
          )}

          <Button
            leftSection={<IconPlus size={16} />}
            onClick={addCustomProperty}
            fullWidth
            variant="light"
          >
            {t("Add Custom Property")}
          </Button>

          <Group justify="flex-end" mt="md">
            <Button onClick={() => setPropertiesModalOpened(false)}>
              {t("Done")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Cover image modal */}
      <Modal
        opened={opened}
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
              {coverImageFile.name} ({Math.round(coverImageFile.size / 1024)}{" "}
              KB)
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
              disabled={isUploadingCover || (!coverImageFile && !coverImageUrl)}
              loading={isUploadingCover}
            >
              {isUploadingCover ? t("Uploading...") : t("Add cover")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
