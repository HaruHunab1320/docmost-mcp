import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import {
  MantineProvider,
  MantineColorScheme,
  useMantineColorScheme,
  MantineThemeOverride,
  useMantineTheme,
} from "@mantine/core";
import { useAtom } from "jotai";
import { userAtom } from "../atoms/current-user-atom";
import {
  getThemeById,
  DocmostTheme,
  mantineCssResolver,
  theme as baseTheme,
} from "@/theme";
import { setManualThemeApplied } from "../hooks/use-current-user";

// Global flag to prevent multiple theme applications
let themeBeingApplied = false;

interface ThemeContextType {
  activeTheme: DocmostTheme;
  setThemeById: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  activeTheme: getThemeById("default-light"),
  setThemeById: () => {},
});

export const useDocmostTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function DocmostThemeProvider({ children }: ThemeProviderProps) {
  const [user] = useAtom(userAtom);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const mantineTheme = useMantineTheme();
  const themeInitializedRef = useRef(false);

  // Use state for active theme to ensure it updates properly
  const [activeTheme, setActiveTheme] = useState<DocmostTheme>(() => {
    const defaultTheme =
      colorScheme === "dark" ? "default-dark" : "default-light";
    const themeId = user?.settings?.preferences?.themeId || defaultTheme;
    return getThemeById(themeId);
  });

  // Construct theme override based on current active theme
  const themeOverride = useMemo<MantineThemeOverride>(() => {
    return {
      ...mantineTheme,
      primaryColor: activeTheme.primaryColor,
      colors: mantineTheme.colors,
    };
  }, [activeTheme, mantineTheme]);

  // Function to apply a theme to all parts of the system
  const applyThemeToSystem = (theme: DocmostTheme) => {
    if (themeBeingApplied) {
      return;
    }

    try {
      themeBeingApplied = true;

      const desiredScheme = theme.isDark ? "dark" : "light";
      if (colorScheme !== desiredScheme) {
        setColorScheme(desiredScheme);
      }

      // Apply CSS custom properties
      document.documentElement.setAttribute("data-theme", theme.id);
      document.documentElement.setAttribute(
        "data-theme-primary",
        theme.primaryColor
      );
      document.documentElement.setAttribute(
        "data-theme-secondary",
        theme.secondaryColor || "red"
      );

      document.documentElement.style.setProperty(
        "--docmost-body-bg",
        theme.bodyBg || "var(--mantine-color-body)"
      );
      document.documentElement.style.setProperty(
        "--docmost-surface-bg",
        theme.surfaceBg || "var(--mantine-color-body)"
      );
      document.documentElement.style.setProperty(
        "--docmost-muted-bg",
        theme.mutedBg || "var(--mantine-color-gray-1)"
      );
      document.documentElement.style.setProperty(
        "--docmost-text-color",
        theme.textColor || "var(--mantine-color-text)"
      );
      document.documentElement.style.setProperty(
        "--docmost-border-color",
        theme.borderColor || "var(--mantine-color-default-border)"
      );

      // Apply font family if specified
      if (theme.headingFontFamily) {
        document.documentElement.style.setProperty(
          "--mantine-heading-font-family",
          theme.headingFontFamily
        );

        // Load Orbitron font if it's specified (for Project 89 themes)
        if (
          theme.headingFontFamily.includes("Orbitron") &&
          !document.getElementById("orbitron-font")
        ) {
          const link = document.createElement("link");
          link.id = "orbitron-font";
          link.rel = "stylesheet";
          link.href =
            "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap";
          document.head.appendChild(link);
        }
      } else {
        // Reset to default heading font
        document.documentElement.style.removeProperty(
          "--mantine-heading-font-family"
        );
      }

      // Apply body font family if specified
      if (theme.fontFamily) {
        document.documentElement.style.setProperty(
          "--mantine-font-family",
          theme.fontFamily
        );

        // Load VT323 font if it's specified
        if (
          theme.fontFamily.includes("VT323") &&
          !document.getElementById("vt323-font")
        ) {
          const link = document.createElement("link");
          link.id = "vt323-font";
          link.rel = "stylesheet";
          link.href =
            "https://fonts.googleapis.com/css2?family=VT323&display=swap";
          document.head.appendChild(link);
        }

        // Load Share Tech Mono font if it's specified
        if (
          theme.fontFamily.includes("Share Tech Mono") &&
          !document.getElementById("share-tech-mono-font")
        ) {
          const link = document.createElement("link");
          link.id = "share-tech-mono-font";
          link.rel = "stylesheet";
          link.href =
            "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap";
          document.head.appendChild(link);
        }
      } else {
        // Reset to default body font
        document.documentElement.style.removeProperty("--mantine-font-family");
      }

      // Remove fonts if no longer needed
      const orbitronLink = document.getElementById("orbitron-font");
      const vt323Link = document.getElementById("vt323-font");
      const shareTechMonoLink = document.getElementById("share-tech-mono-font");

      if (!theme.id.includes("project89")) {
        // Remove Project 89 fonts if switching to a different theme
        if (orbitronLink) orbitronLink.remove();
        if (vt323Link) vt323Link.remove();
        if (shareTechMonoLink) shareTechMonoLink.remove();
      }

      // Apply global CSS custom properties for theme colors
      document.documentElement.style.setProperty(
        "--theme-primary-color",
        theme.primaryColor
      );
      document.documentElement.style.setProperty(
        "--theme-primary-dark",
        `var(--mantine-color-${theme.primaryColor}-7)`
      );
      document.documentElement.style.setProperty(
        "--theme-primary-light",
        `var(--mantine-color-${theme.primaryColor}-2)`
      );

      // Important: update state last to ensure UI updates
      setActiveTheme(theme);
    } finally {
      setTimeout(() => {
        themeBeingApplied = false;
      }, 50); // Small delay to prevent rapid consecutive changes
    }
  };

  // This effect only runs once on mount to set the initial theme
  useEffect(() => {
    if (themeInitializedRef.current) return;

    themeInitializedRef.current = true;

    // Apply the initial theme
    if (user?.settings?.preferences?.themeId) {
      const themeId = user.settings.preferences.themeId;
      const userTheme = getThemeById(themeId);

      applyThemeToSystem(userTheme);
    }
  }, [user]);

  // This effect handles user preference changes
  useEffect(() => {
    // Skip if no user or the initial theme setup hasn't happened yet
    if (!user || !themeInitializedRef.current) return;

    const userThemeId = user.settings?.preferences?.themeId;

    // We only want to respond to user preference changes if:
    // 1. A manual theme hasn't been applied (i.e., user didn't explicitly select a theme)
    // 2. The theme ID from user preferences exists and is different from the current active theme
    if (userThemeId && userThemeId !== activeTheme.id) {
      // Only apply the theme from user preferences if a theme wasn't manually selected
      const userTheme = getThemeById(userThemeId);
      applyThemeToSystem(userTheme);
    }
  }, [user?.settings?.preferences?.themeId, activeTheme.id]);

  // This function is used by other components to change the theme
  const setThemeById = (themeId: string) => {
    try {
      const theme = getThemeById(themeId);
      setActiveTheme(theme);
      document.documentElement.setAttribute("data-theme", themeId);
      document.documentElement.setAttribute("data-theme-id", themeId);
      document.documentElement.setAttribute(
        "data-theme-primary",
        theme.primaryColor
      );
      document.documentElement.setAttribute(
        "data-theme-secondary",
        theme.secondaryColor || "red"
      );
      document.documentElement.style.setProperty(
        "--docmost-body-bg",
        theme.bodyBg || "var(--mantine-color-body)"
      );
      document.documentElement.style.setProperty(
        "--docmost-surface-bg",
        theme.surfaceBg || "var(--mantine-color-body)"
      );
      document.documentElement.style.setProperty(
        "--docmost-muted-bg",
        theme.mutedBg || "var(--mantine-color-gray-1)"
      );
      document.documentElement.style.setProperty(
        "--docmost-text-color",
        theme.textColor || "var(--mantine-color-text)"
      );
      document.documentElement.style.setProperty(
        "--docmost-border-color",
        theme.borderColor || "var(--mantine-color-default-border)"
      );
      const desiredScheme = theme.isDark ? "dark" : "light";
      if (colorScheme !== desiredScheme) {
        setColorScheme(desiredScheme);
      }
    } catch (error) {
      console.error("Error setting theme:", error);
    }
  };

  // Initialize theme from user preferences or fallback to default
  useEffect(() => {
    if (!themeInitializedRef.current && user) {
      themeInitializedRef.current = true;

      // Get from user preferences
      const userThemeId =
        user.settings?.preferences?.themeId || "default-light";

      try {
        setThemeById(userThemeId);
      } catch (error) {
        console.error("Failed to set initial theme:", error);
        // Fallback to default
        setThemeById("default-light");
      }
    }
  }, [user]);

  // Update theme when user preferences change
  useEffect(() => {
    if (themeInitializedRef.current && user && !themeBeingApplied) {
      const userThemeId =
        user.settings?.preferences?.themeId || "default-light";

      if (userThemeId !== activeTheme.id) {
        try {
          setThemeById(userThemeId);
        } catch (error) {
          console.error("Failed to update theme from preferences:", error);
        }
      }
    }
  }, [user, activeTheme.id]);

  return (
    <ThemeContext.Provider value={{ activeTheme, setThemeById }}>
      <MantineProvider theme={themeOverride}>{children}</MantineProvider>
    </ThemeContext.Provider>
  );
}

// Utility hook for other components to access theme colors
export function useThemeColors() {
  const { activeTheme } = useDocmostTheme();
  const { colorScheme } = useMantineColorScheme();

  return {
    primaryColor: activeTheme.primaryColor,
    secondaryColor: activeTheme.secondaryColor || "red",
    isDark: colorScheme === "dark",
  };
}
