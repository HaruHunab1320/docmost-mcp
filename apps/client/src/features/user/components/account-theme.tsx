import {
  Group,
  Text,
  useMantineColorScheme,
  Select,
  MantineColorScheme,
  Paper,
  SimpleGrid,
  Avatar,
  Stack,
  Card,
  Radio,
  Title,
  Badge,
  useMantineTheme,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { RAVEN_DOCS_THEMES, getThemeById } from "@/theme";
import { useAtom } from "jotai";
import { currentUserAtom } from "../atoms/current-user-atom";
import { updateUser } from "../services/user-service";
import { useState, useEffect } from "react";

export default function AccountTheme() {
  const { t } = useTranslation();

  return (
    <Group justify="space-between" wrap="nowrap" gap="xl">
      <div>
        <Text size="md">{t("Theme")}</Text>
        <Text size="sm" c="dimmed">
          {t("Choose your preferred theme for the application.")}
        </Text>
      </div>

      <ThemeSwitcher />
    </Group>
  );
}

function ThemeSwitcher() {
  const { t } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const user = currentUser?.user;
  const [selectedThemeId, setSelectedThemeId] = useState<string>(
    user?.settings?.preferences?.themeId || "default-light"
  );
  const theme = useMantineTheme();

  // Handle system light/dark preference changes
  useEffect(() => {
    const savedThemeId = user.settings?.preferences?.themeId;

    // If the user hasn't selected a theme yet, use default based on system preference
    if (!savedThemeId) {
      // Determine light/dark from system or mantine's colorScheme setting
      const baseTheme =
        colorScheme === "dark" ? "default-dark" : "default-light";
      setSelectedThemeId(baseTheme);
    } else {
      // Set color scheme based on the saved theme's isDark property
      const userTheme = getThemeById(savedThemeId);
      if (userTheme.isDark && colorScheme !== "dark") {
        setColorScheme("dark");
      } else if (!userTheme.isDark && colorScheme !== "light") {
        setColorScheme("light");
      }
    }
  }, [colorScheme, user?.settings?.preferences?.themeId]);

  const applyTheme = async (themeId: string) => {
    try {
      const selectedTheme = getThemeById(themeId);

      // Update Mantine color scheme
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

      // Save to backend
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

      // Update local state
      setSelectedThemeId(themeId);
    } catch (error) {
      console.error("Failed to update theme preference:", error);
    }
  };

  return (
    <Stack w="100%" gap="md">
      <Radio.Group
        value={selectedThemeId}
        onChange={applyTheme}
        name="themeChoice"
        label={t("Select a theme")}
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="xs">
          {RAVEN_DOCS_THEMES.map((themeOption) => (
            <Card
              key={themeOption.id}
              padding="xs"
              radius="md"
              withBorder
              style={{
                borderColor:
                  selectedThemeId === themeOption.id
                    ? theme.colors[themeOption.primaryColor][5]
                    : undefined,
                borderWidth: selectedThemeId === themeOption.id ? 2 : 1,
                backgroundColor: themeOption.isDark
                  ? theme.colors.dark[7]
                  : theme.white,
              }}
            >
              <Group wrap="nowrap">
                <Radio value={themeOption.id} aria-label={themeOption.name} />
                <Stack gap={0}>
                  <Group gap="xs">
                    <Text
                      fw={500}
                      size="sm"
                      c={themeOption.isDark ? "white" : "black"}
                    >
                      {themeOption.name}
                    </Text>
                    {selectedThemeId === themeOption.id && (
                      <Badge
                        size="xs"
                        color={themeOption.primaryColor}
                        variant="filled"
                      >
                        {t("Active")}
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c={themeOption.isDark ? "gray.5" : "gray.6"}>
                    {themeOption.description}
                  </Text>
                </Stack>
              </Group>
              <Group mt="xs" justify="flex-end">
                <Paper
                  radius="sm"
                  w={15}
                  h={15}
                  style={{
                    backgroundColor: theme.colors[themeOption.primaryColor][5],
                  }}
                />
                {themeOption.secondaryColor && (
                  <Paper
                    radius="sm"
                    w={15}
                    h={15}
                    style={{
                      backgroundColor:
                        theme.colors[themeOption.secondaryColor][5],
                    }}
                  />
                )}
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Radio.Group>
    </Stack>
  );
}

// Fallback for legacy support - this component can be used as a standalone color scheme selector
export function ColorSchemeSwitcher() {
  const { t } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const handleChange = (value: MantineColorScheme) => {
    setColorScheme(value);
  };

  return (
    <Select
      label={t("Color mode")}
      data={[
        { value: "light", label: t("Light") },
        { value: "dark", label: t("Dark") },
        { value: "auto", label: t("System settings") },
      ]}
      value={colorScheme}
      onChange={handleChange}
      allowDeselect={false}
      checkIconPosition="right"
    />
  );
}
