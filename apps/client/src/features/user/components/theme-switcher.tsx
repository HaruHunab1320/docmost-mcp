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
import { userAtom } from "../atoms/current-user-atom";
import { updateUser } from "../services/user-service";
import { useDocmostTheme } from "../providers/theme-provider";
import { DOCMOST_THEMES, getThemeById } from "@/theme";
import { useTranslation } from "react-i18next";
import { setManualThemeApplied } from "../hooks/use-current-user";
import { useColorScheme } from "@mantine/hooks";

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { activeTheme, setThemeById } = useDocmostTheme();
  const [user, setUser] = useAtom(userAtom);
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);

  const isDark = colorScheme === "dark";

  const lightThemes = DOCMOST_THEMES.filter((theme) => !theme.isDark);
  const darkThemes = DOCMOST_THEMES.filter((theme) => theme.isDark);

  // Toggle between light and dark mode only
  const toggleColorScheme = async () => {
    const newColorScheme = isDark ? "light" : "dark";
    setColorScheme(newColorScheme);

    // Find the corresponding theme with the same primary color
    const baseThemeId = activeTheme.id;
    const baseParts = baseThemeId.split("-");
    const baseColor = baseParts[0];

    // If we're switching to dark, find a dark theme with the same base color
    // Otherwise, find a light theme with the same base color
    const newThemeId = `${baseColor}-${newColorScheme}`;

    // Only update if the theme exists
    const newTheme = DOCMOST_THEMES.find((t) => t.id === newThemeId);
    if (newTheme) {
      try {
        // Mark as manually set to prevent override
        setManualThemeApplied(true);

        const updatedUser = await updateUser({ themeId: newThemeId });
        setUser(updatedUser);
        setThemeById(newThemeId);
      } catch (error) {
        console.error("Failed to update theme:", error);
      }
    }
  };

  // Apply a specific theme
  const applyTheme = async (themeId: string) => {
    try {
      // Find the selected theme from available themes
      const selectedTheme = DOCMOST_THEMES.find(
        (theme) => theme.id === themeId
      );
      if (!selectedTheme) throw new Error(`Theme ${themeId} not found`);

      // Set the color scheme based on theme's dark mode setting
      setColorScheme(selectedTheme.isDark ? "dark" : "light");

      // Attempt to save the theme to the backend
      const updatedUser = await updateUser({ themeId });

      // Validate the user object contains theme preferences
      if (
        updatedUser &&
        updatedUser.settings &&
        updatedUser.settings.preferences &&
        updatedUser.settings.preferences.themeId === themeId
      ) {
        // Update user context with new preferences
        setUser(updatedUser);
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
            variant="default"
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
          onClick={() => setColorScheme("light")}
          color={colorScheme === "light" ? theme.primaryColor : undefined}
        >
          {t("Light")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconMoon style={{ width: rem(16), height: rem(16) }} />}
          onClick={() => setColorScheme("dark")}
          color={colorScheme === "dark" ? theme.primaryColor : undefined}
        >
          {t("Dark")}
        </Menu.Item>
        <Menu.Item
          leftSection={
            <IconDeviceDesktop style={{ width: rem(16), height: rem(16) }} />
          }
          onClick={() => setColorScheme("auto")}
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
