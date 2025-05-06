import {
  Card,
  Group,
  Text,
  ActionIcon,
  Menu,
  TextInput,
  Tooltip,
  Divider,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { Task } from "../types";
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
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
  users?: any[];
}

export function TaskCard({
  task,
  onClick,
  isDragging = false,
  users = [],
}: TaskCardProps) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  // Handle title edit
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.currentTarget.value);
  };

  const handleTitleBlur = () => {
    // TODO: Save the title changes to the backend
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

  // Prevent card click when clicking on menu items
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        <UnstyledButton
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Open emoji picker
          }}
          style={{ flexShrink: 0, width: 24 }}
        >
          <ActionIcon
            color={task.status === "done" ? "teal" : "gray"}
            variant={task.status === "done" ? "filled" : "outline"}
            radius="xl"
            size="sm"
          >
            {task.status === "done" ? (
              <IconCheck size={14} />
            ) : (
              <div style={{ width: 14, height: 14 }} />
            )}
          </ActionIcon>
        </UnstyledButton>

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
          <Text fw={500} size="sm" lineClamp={1} style={{ flex: 1 }}>
            {task.title}
          </Text>
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
    </Card>
  );
}
