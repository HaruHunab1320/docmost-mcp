import { useEffect, useMemo, useState } from "react";
import { Button, Group, Modal, Select, Stack, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCreateTaskMutation } from "@/features/project/hooks/use-tasks";
import { Project } from "@/features/project/types";

interface QuickTaskModalProps {
  opened: boolean;
  onClose: () => void;
  spaceId: string;
  projects: Project[];
  defaultProjectId?: string | null;
}

export function QuickTaskModal({
  opened,
  onClose,
  spaceId,
  projects,
  defaultProjectId,
}: QuickTaskModalProps) {
  const { t } = useTranslation();
  const createTaskMutation = useCreateTaskMutation();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.name })),
    [projects]
  );

  useEffect(() => {
    if (!opened) return;
    setTitle("");
    setProjectId(defaultProjectId || null);
  }, [defaultProjectId, opened]);

  const handleCreate = async () => {
    if (!title.trim() || !projectId) return;
    await createTaskMutation.mutateAsync({
      title: title.trim(),
      projectId,
      spaceId,
    });
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t("Quick add task")}>
      <Stack>
        <Select
          label={t("Project")}
          placeholder={t("Select project")}
          data={projectOptions}
          value={projectId}
          onChange={setProjectId}
          searchable
          clearable
        />
        <TextInput
          label={t("Task title")}
          placeholder={t("What needs to be done?")}
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || !projectId}
            loading={createTaskMutation.isPending}
          >
            {t("Create task")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
