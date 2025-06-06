import React, { ReactNode, useState, useCallback, memo } from "react";
import {
  ActionIcon,
  Popover,
  Button,
  useMantineColorScheme,
} from "@mantine/core";
import { useClickOutside, useDisclosure, useWindowEvent } from "@mantine/hooks";
import { Suspense } from "react";
const Picker = React.lazy(() => import("@emoji-mart/react"));
import { useTranslation } from "react-i18next";

export interface EmojiPickerInterface {
  onEmojiSelect: (emoji: any) => void;
  icon: ReactNode;
  removeEmojiAction: () => void;
  readOnly: boolean;
}

// Use React.memo to prevent unnecessary re-renders
const EmojiPicker = memo(function EmojiPicker({
  onEmojiSelect,
  icon,
  removeEmojiAction,
  readOnly,
}: EmojiPickerInterface) {
  const { t } = useTranslation();
  const [opened, handlers] = useDisclosure(false);
  const { colorScheme } = useMantineColorScheme();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [dropdown, setDropdown] = useState<HTMLDivElement | null>(null);

  // Use useClickOutside with a stable array reference
  useClickOutside(
    () => {
      if (opened) {
        handlers.close();
      }
    },
    ["mousedown", "touchstart"],
    [dropdown, target]
  );

  // Memoize handlers to prevent unnecessary re-renders
  const handleEmojiSelect = useCallback(
    (emoji) => {
      onEmojiSelect(emoji);
      handlers.close();
    },
    [onEmojiSelect, handlers]
  );

  const handleRemoveEmoji = useCallback(() => {
    removeEmojiAction();
    handlers.close();
  }, [removeEmojiAction, handlers]);

  // We need this because the default Mantine popover closeOnEscape does not work
  useWindowEvent("keydown", (event) => {
    if (opened && event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      handlers.close();
    }
  });

  // Memoize the toggle handler
  const togglePopover = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (readOnly) return;
      handlers.toggle();
    },
    [handlers, readOnly]
  );

  return (
    <Popover
      opened={opened}
      onClose={handlers.close}
      width={332}
      position="bottom"
      disabled={readOnly}
      closeOnEscape={true}
      zIndex={2000}
      shadow="md"
      withinPortal={true}
    >
      <Popover.Target ref={setTarget}>
        <ActionIcon
          c="gray"
          variant="transparent"
          onClick={togglePopover}
          disabled={readOnly}
        >
          {icon}
        </ActionIcon>
      </Popover.Target>
      {opened && (
        <Suspense fallback={null}>
          <Popover.Dropdown
            bg="000"
            style={{ border: "none" }}
            ref={setDropdown}
          >
            <Picker
              data={async () => (await import("@emoji-mart/data")).default}
              onEmojiSelect={handleEmojiSelect}
              perLine={8}
              skinTonePosition="search"
              theme={colorScheme}
            />
            <Button
              variant="default"
              c="gray"
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
          </Popover.Dropdown>
        </Suspense>
      )}
    </Popover>
  );
});

export default EmojiPicker;
