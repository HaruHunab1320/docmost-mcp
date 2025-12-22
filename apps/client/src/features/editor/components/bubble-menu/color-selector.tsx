import { Dispatch, FC, SetStateAction } from "react";
import { IconCheck, IconPalette } from "@tabler/icons-react";
import {
  ActionIcon,
  Button,
  Popover,
  rem,
  ScrollArea,
  Text,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { useEditor } from "@tiptap/react";
import { useTranslation } from "react-i18next";

export interface BubbleColorMenuItem {
  name: string;
  color: string;
}

interface ColorSelectorProps {
  editor: ReturnType<typeof useEditor>;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const TEXT_COLORS: BubbleColorMenuItem[] = [
  {
    name: "Default",
    color: "",
  },
  {
    name: "Blue",
    color: "#2563EB",
  },
  {
    name: "Green",
    color: "#008A00",
  },
  {
    name: "Purple",
    color: "#9333EA",
  },
  {
    name: "Red",
    color: "#E00000",
  },
  {
    name: "Yellow",
    color: "#EAB308",
  },
  {
    name: "Orange",
    color: "#FFA500",
  },
  {
    name: "Pink",
    color: "#BA4081",
  },
  {
    name: "Gray",
    color: "#A8A29E",
  },
];

const HIGHLIGHT_COLORS_LIGHT: BubbleColorMenuItem[] = [
  {
    name: "Default",
    color: "",
  },
  {
    name: "Blue",
    color: "#c1ecf9",
  },
  {
    name: "Green",
    color: "#acf79f",
  },
  {
    name: "Purple",
    color: "#f6f3f8",
  },
  {
    name: "Red",
    color: "#fdebeb",
  },
  {
    name: "Yellow",
    color: "#fbf4a2",
  },
  {
    name: "Orange",
    color: "#faebdd",
  },
  {
    name: "Pink",
    color: "#faf1f5",
  },
  {
    name: "Gray",
    color: "#f1f1ef",
  },
];

const HIGHLIGHT_COLORS_DARK: BubbleColorMenuItem[] = [
  {
    name: "Default",
    color: "",
  },
  {
    name: "Blue",
    color: "#1c4e63",
  },
  {
    name: "Green",
    color: "#245a2b",
  },
  {
    name: "Purple",
    color: "#3b2b52",
  },
  {
    name: "Red",
    color: "#5a2a2a",
  },
  {
    name: "Yellow",
    color: "#5a4b1e",
  },
  {
    name: "Orange",
    color: "#5a3b1f",
  },
  {
    name: "Pink",
    color: "#5a2f45",
  },
  {
    name: "Gray",
    color: "#3b3b3b",
  },
];

export const ColorSelector: FC<ColorSelectorProps> = ({
  editor,
  isOpen,
  setIsOpen,
}) => {
  const { t } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const highlightColors =
    colorScheme === "dark" ? HIGHLIGHT_COLORS_DARK : HIGHLIGHT_COLORS_LIGHT;
  const activeColorItem = TEXT_COLORS.find(({ color }) =>
    editor.isActive("textStyle", { color }),
  );

  return (
    <Popover width={200} opened={isOpen} withArrow>
      <Popover.Target>
        <Tooltip label={t("Text color")} withArrow>
          <ActionIcon
            variant="default"
            size="lg"
            radius="0"
            style={{
              border: "none",
              color: activeColorItem?.color,
            }}
            onClick={() => setIsOpen(!isOpen)}
          >
            <IconPalette size={16} stroke={2} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown>
        {/* make mah responsive */}
        <ScrollArea.Autosize type="scroll" mah="400">
          <Text span c="dimmed" tt="uppercase" inherit>
            {t("Color")}
          </Text>

          <Button.Group orientation="vertical">
            {TEXT_COLORS.map(({ name, color }, index) => (
              <Button
                key={index}
                variant="default"
                leftSection={<span style={{ color }}>A</span>}
                justify="left"
                fullWidth
                rightSection={
                  editor.isActive("textStyle", { color }) && (
                    <IconCheck style={{ width: rem(16) }} />
                  )
                }
                onClick={() => {
                  editor.commands.unsetColor();
                  name !== "Default" &&
                    editor
                      .chain()
                      .focus()
                      .setColor(color || "")
                      .run();
                  setIsOpen(false);
                }}
                style={{ border: "none" }}
              >
                {t(name)}
              </Button>
            ))}
          </Button.Group>

          <Text span c="dimmed" tt="uppercase" inherit mt="md">
            {t("Highlight")}
          </Text>

          <Button.Group orientation="vertical">
            {highlightColors.map(({ name, color }, index) => (
              <Button
                key={index}
                variant="default"
                leftSection={
                  <span
                    style={{
                      color: color || undefined,
                      backgroundColor: color || "transparent",
                      padding: "0 2px",
                      borderRadius: 2,
                    }}
                  >
                    A
                  </span>
                }
                justify="left"
                fullWidth
                rightSection={
                  editor.isActive("highlight", { color }) && (
                    <IconCheck style={{ width: rem(16) }} />
                  )
                }
                onClick={() => {
                  editor.commands.unsetHighlight();
                  name !== "Default" &&
                    editor
                      .chain()
                      .focus()
                      .setHighlight({ color: color || "" })
                      .run();
                  setIsOpen(false);
                }}
                style={{ border: "none" }}
              >
                {t(name)}
              </Button>
            ))}
          </Button.Group>
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
};
