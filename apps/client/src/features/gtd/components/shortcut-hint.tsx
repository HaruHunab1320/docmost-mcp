import { useMemo } from "react";
import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

interface ShortcutHintProps {
  showCapture?: boolean;
  showTriage?: boolean;
}

export function ShortcutHint({
  showCapture = true,
  showTriage = true,
}: ShortcutHintProps) {
  const { t } = useTranslation();
  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  }, []);

  const captureShortcut = isMac ? "Cmd+K" : "Ctrl+K";
  const triageShortcut = isMac ? "Cmd+Shift+K" : "Ctrl+Shift+K";
  const items = [
    showCapture ? `${captureShortcut} capture` : null,
    showTriage ? `${triageShortcut} triage` : null,
  ]
    .filter(Boolean)
    .join(", ");

  if (!items) return null;

  return (
    <Text size="xs" c="dimmed">
      {t("Shortcuts: {{items}}", { items })}
    </Text>
  );
}
