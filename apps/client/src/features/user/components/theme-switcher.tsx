import {
  ActionIcon,
  Menu,
  useMantineColorScheme,
  useMantineTheme,
  Tooltip,
  rem,
  Group,
  Text,
  Divider,
  Stack,
  ColorSwatch,
} from "@mantine/core";
import {
  IconPalette,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconCheck,
} from "@tabler/icons-react";
import { useState } from "react";
import { useAtom } from "jotai";
import { currentUserAtom } from "../atoms/current-user-atom";
import { updateUser } from "../services/user-service";
import { useRavenDocsTheme } from "../providers/theme-provider";
import { RAVEN_DOCS_THEMES, getThemeById } from "@/theme";
import { useTranslation } from "react-i18next";
import { setManualThemeApplied } from "../hooks/use-current-user";
import { useColorScheme } from "@mantine/hooks";

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { activeTheme, setThemeById } = useRavenDocsTheme();
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
  const systemScheme = useColorScheme();

  const isDark = colorScheme === "dark";
  const isDefaultLightTheme = activeTheme.id === "default-light";
  const isDefaultDarkTheme = activeTheme.id === "default-dark";

  const lightThemes = RAVEN_DOCS_THEMES.filter((theme) => !theme.isDark);
  const darkThemes = RAVEN_DOCS_THEMES.filter((theme) => theme.isDark);

  const applyLightOrDarkTheme = async (scheme: "light" | "dark") => {
    const activeId = activeTheme.id;
    const isLightTheme = activeId.endsWith("-light");
    const isDarkTheme = activeId.endsWith("-dark");
    const baseId =
      isLightTheme || isDarkTheme
        ? activeId.replace(/-(light|dark)$/, "")
        : "";
    const candidateId = baseId ? `${baseId}-${scheme}` : "";

    if (
      candidateId &&
      RAVEN_DOCS_THEMES.some((theme) => theme.id === candidateId)
    ) {
      await applyTheme(candidateId);
      return;
    }

    await applyTheme(scheme === "light" ? "default-light" : "default-dark");
  };

  // Apply a specific theme
  const applyTheme = async (themeId: string) => {
    try {
      // Find the selected theme from available themes
      const selectedTheme = RAVEN_DOCS_THEMES.find(
        (theme) => theme.id === themeId
      );
      if (!selectedTheme) throw new Error(`Theme ${themeId} not found`);

      // Set the color scheme based on theme's dark mode setting
      setColorScheme(selectedTheme.isDark ? "dark" : "light");

      // Optimistically update user preferences to prevent theme bounce.
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                settings: {
                  ...prev.user.settings,
                  preferences: {
                    ...prev.user.settings?.preferences,
                    themeId,
                  },
                },
              },
            }
          : prev
      );

      // Attempt to save the theme to the backend
      const updatedUser = await updateUser({ themeId });
      if (updatedUser) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                user: updatedUser,
              }
            : prev
        );
      }

      // Mark theme as manually applied
      setManualThemeApplied(true);

      // Apply theme locally regardless of backend success
      setThemeById(themeId);
      setOpened(false);

      // Apply theme directly to document (as a fallback)
      document.documentElement.setAttribute(
        "data-theme-primary",
        selectedTheme.primaryColor
      );
      document.documentElement.setAttribute(
        "data-theme-secondary",
        selectedTheme.secondaryColor || "red"
      );
    } catch (error) {
      console.error("Failed to update theme:", error);
    }
  };

  return (
    <Menu
      position="bottom-end"
      width={220}
      opened={opened}
      onChange={setOpened}
      offset={5}
    >
      <Menu.Target>
        <Tooltip label={t("Change theme")} withArrow>
          <ActionIcon
            variant="subtle"
            color={theme.primaryColor}
            size="md"
            aria-label={t("Toggle color scheme")}
          >
            <IconPalette
              style={{ width: rem(18), height: rem(18) }}
              stroke={1.5}
            />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{t("Color mode")}</Menu.Label>
        <Menu.Item
          leftSection={<IconSun style={{ width: rem(16), height: rem(16) }} />}
          onClick={() => applyLightOrDarkTheme("light")}
          color={isDefaultLightTheme ? theme.primaryColor : undefined}
        >
          {t("Light")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconMoon style={{ width: rem(16), height: rem(16) }} />}
          onClick={() => applyLightOrDarkTheme("dark")}
          color={isDefaultDarkTheme ? theme.primaryColor : undefined}
        >
          {t("Dark")}
        </Menu.Item>
        <Menu.Item
          leftSection={
            <IconDeviceDesktop style={{ width: rem(16), height: rem(16) }} />
          }
          onClick={async () => {
            setColorScheme("auto");
            await applyLightOrDarkTheme(systemScheme === "dark" ? "dark" : "light");
          }}
          color={colorScheme === "auto" ? theme.primaryColor : undefined}
        >
          {t("System")}
        </Menu.Item>

        <Divider my="xs" />

        <Menu.Label>{t("Light themes")}</Menu.Label>
        {lightThemes.map((themeOption) => (
          <Menu.Item
            key={themeOption.id}
            onClick={() => applyTheme(themeOption.id)}
            color={
              activeTheme.id === themeOption.id ? theme.primaryColor : undefined
            }
          >
            <Group wrap="nowrap">
              <div
                style={{
                  width: rem(14),
                  height: rem(14),
                  borderRadius: rem(4),
                  backgroundColor: theme.colors[themeOption.primaryColor][5],
                }}
              />
              <Text size="sm">{themeOption.name}</Text>
            </Group>
          </Menu.Item>
        ))}

        <Divider my="xs" />

        <Menu.Label>{t("Dark themes")}</Menu.Label>
        {darkThemes.map((themeOption) => (
          <Menu.Item
            key={themeOption.id}
            onClick={() => applyTheme(themeOption.id)}
            color={
              activeTheme.id === themeOption.id ? theme.primaryColor : undefined
            }
          >
            <Group wrap="nowrap">
              <div
                style={{
                  width: rem(14),
                  height: rem(14),
                  borderRadius: rem(4),
                  backgroundColor: theme.colors[themeOption.primaryColor][5],
                }}
              />
              <Text size="sm">{themeOption.name}</Text>
            </Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
