import { useEffect, useMemo, useRef, useState } from "react";
import { TextInput, Tooltip } from "@mantine/core";
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
import { setTaskBucket } from "@/features/gtd/utils/task-buckets";
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  }, []);

  const fallbackSpace = useMemo(() => {
    if (!spacesData) return undefined;
    if (Array.isArray(spacesData.items)) return spacesData.items[0];
    // Legacy shape support
    if (Array.isArray((spacesData as any).data)) return (spacesData as any).data[0];
    return undefined;
  }, [spacesData]);

  const activeSpace = spaceBySlug || spaceById || fallbackSpace;

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
      const created = await createTaskMutation.mutateAsync({
        title: parsed.title,
        spaceId: activeSpace.id,
      });
      if (parsed.bucket && created?.id) {
        setTaskBucket(activeSpace.id, created.id, parsed.bucket);
      }
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
      <TextInput
        className={classes.input}
        placeholder={t("Capture to Inbox")}
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
      />
    </Tooltip>
  );
}
