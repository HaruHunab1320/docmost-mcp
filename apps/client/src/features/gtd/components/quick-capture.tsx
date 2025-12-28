import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Select, TextInput, Tooltip } from "@mantine/core";
import { IconBolt } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetSpaceBySlugQuery,
  useGetSpacesQuery,
  useSpaceQuery,
} from "@/features/space/queries/space-query";
import { useCreateTaskMutation } from "@/features/project/hooks/use-tasks";
import { useTranslation } from "react-i18next";
import classes from "./quick-capture.module.css";
import { parseBucketedInput } from "@/features/gtd/utils/auto-bucket";
import APP_ROUTE from "@/lib/app-route";

function isEditableTarget(target: EventTarget | null) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

export function QuickCapture() {
  const { t } = useTranslation();
  const { spaceId, spaceSlug } = useParams<{
    spaceId?: string;
    spaceSlug?: string;
  }>();
  const { data: spaceById } = useSpaceQuery(spaceId || "");
  const { data: spaceBySlug } = useGetSpaceBySlugQuery(spaceSlug || "");
  const { data: spacesData } = useGetSpacesQuery({ page: 1, limit: 50 });
  const createTaskMutation = useCreateTaskMutation();
  const [value, setValue] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  }, []);

  const spaces = useMemo(() => {
    if (!spacesData) return [];
    if (Array.isArray(spacesData.items)) return spacesData.items;
    if (Array.isArray((spacesData as any).data))
      return (spacesData as any).data;
    return [];
  }, [spacesData]);

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId),
    [selectedSpaceId, spaces]
  );

  const activeSpace = spaceBySlug || spaceById || selectedSpace;

  const spaceOptions = useMemo(
    () =>
      spaces.map((space) => ({
        value: space.id,
        label: space.name,
      })),
    [spaces]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("ravenDocs.lastSpaceId");
    if (stored && !selectedSpaceId) {
      setSelectedSpaceId(stored);
    }
  }, [selectedSpaceId]);

  useEffect(() => {
    if (!activeSpace?.id || typeof window === "undefined") return;
    window.localStorage.setItem("ravenDocs.lastSpaceId", activeSpace.id);
    setSelectedSpaceId(activeSpace.id);
  }, [activeSpace?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isEditableTarget(event.target)) return;
      const isModifier = isMac ? event.metaKey : event.ctrlKey;
      if (!isModifier) return;
      const key = event.key.toLowerCase();
      if (key === "k" && !event.shiftKey) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (key === "k" && event.shiftKey && activeSpace?.id) {
        event.preventDefault();
        navigate(APP_ROUTE.SPACE.TRIAGE(activeSpace.id));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSpace?.id, isMac, navigate]);

  const handleSubmit = async () => {
    const input = value.trim();
    if (!input || !activeSpace?.id) return;
    const parsed = parseBucketedInput(input);
    if (!parsed.title) return;
    try {
      await createTaskMutation.mutateAsync({
        title: parsed.title,
        spaceId: activeSpace.id,
        ...(parsed.bucket ? { bucket: parsed.bucket } : {}),
      });
      setValue("");
    } catch (error) {
      // Notifications are handled by mutation hook.
    }
  };

  const captureShortcut = isMac ? "Cmd+K" : "Ctrl+K";
  return (
    <Tooltip
      label={t("Quick capture to Inbox ({{shortcut}})", {
        shortcut: captureShortcut,
      })}
      withArrow
    >
      <Group className={classes.group} wrap="nowrap">
        {!activeSpace?.id && spaceOptions.length > 0 && (
          <Select
            className={classes.select}
            placeholder={t("Select space")}
            data={spaceOptions}
            value={selectedSpaceId}
            onChange={setSelectedSpaceId}
            searchable
            clearable
            size="sm"
            radius="md"
          />
        )}
        <TextInput
          className={classes.input}
          placeholder={
            activeSpace?.id ? t("Capture to Inbox") : t("Select a space to capture")
          }
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSubmit();
            }
          }}
          leftSection={<IconBolt size={16} />}
          disabled={!activeSpace?.id}
          ref={inputRef}
          size="sm"
          radius="md"
        />
      </Group>
    </Tooltip>
  );
}
