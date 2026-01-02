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
} from "@mantine/core";
import { useAtom } from "jotai";
import { userAtom } from "../atoms/current-user-atom";
import {
  getThemeById,
  RavenDocsTheme,
  mantineCssResolver,
  theme as baseTheme,
} from "@/theme";
import {
  clearManualThemeApplied,
  isManualThemeApplied,
  setManualThemeApplied,
} from "../hooks/use-current-user";

// Global flag to prevent multiple theme applications
let themeBeingApplied = false;

interface ThemeContextType {
  activeTheme: RavenDocsTheme;
  setThemeById: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  activeTheme: getThemeById("default-light"),
  setThemeById: () => {},
});

export const useRavenDocsTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function RavenDocsThemeProvider({ children }: ThemeProviderProps) {
  const [user] = useAtom(userAtom);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const themeInitializedRef = useRef(false);
  const applyingThemeRef = useRef(false);

  // Use state for active theme to ensure it updates properly
  const [activeTheme, setActiveTheme] = useState<RavenDocsTheme>(() => {
    const defaultTheme =
      colorScheme === "dark" ? "default-dark" : "default-light";
    const themeId = user?.settings?.preferences?.themeId || defaultTheme;
    return getThemeById(themeId);
  });

  // Construct theme override based on current active theme
  const themeOverride = useMemo<MantineThemeOverride>(() => {
    return {
      ...baseTheme,
      primaryColor: activeTheme.primaryColor,
    };
  }, [activeTheme]);

  // Function to apply a theme to all parts of the system
  const applyThemeToSystem = (theme: RavenDocsTheme) => {
    if (themeBeingApplied) return;

    try {
      themeBeingApplied = true;
      applyingThemeRef.current = true;

      // Update state immediately to avoid stale theme during color scheme changes.
      setActiveTheme(theme);

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
        "--raven-docs-body-bg",
        theme.bodyBg || "var(--mantine-color-body)"
      );
      document.documentElement.style.setProperty(
        "--raven-docs-surface-bg",
        theme.surfaceBg || "var(--mantine-color-body)"
      );
      document.documentElement.style.setProperty(
        "--raven-docs-muted-bg",
        theme.mutedBg || "var(--mantine-color-gray-1)"
      );
      document.documentElement.style.setProperty(
        "--raven-docs-text-color",
        theme.textColor || "var(--mantine-color-text)"
      );
      document.documentElement.style.setProperty(
        "--raven-docs-border-color",
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

    } finally {
      setTimeout(() => {
        themeBeingApplied = false;
        applyingThemeRef.current = false;
      }, 50); // Small delay to prevent rapid consecutive changes
    }
  };

  // This function is used by other components to change the theme
  const setThemeById = (themeId: string) => {
    try {
      const theme = getThemeById(themeId);
      setManualThemeApplied(true);
      applyThemeToSystem(theme);
    } catch (error) {
      console.error("Error setting theme:", error);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (themeBeingApplied || applyingThemeRef.current) return;
    const fallbackTheme =
      colorScheme === "dark" ? "default-dark" : "default-light";
    const desiredThemeId = user.settings?.preferences?.themeId || fallbackTheme;
    if (!themeInitializedRef.current) {
      themeInitializedRef.current = true;
    }

    if (isManualThemeApplied() && desiredThemeId !== activeTheme.id) {
      return;
    }

    if (isManualThemeApplied() && desiredThemeId === activeTheme.id) {
      clearManualThemeApplied();
    }

    if (desiredThemeId !== activeTheme.id) {
      const theme = getThemeById(desiredThemeId);
      applyThemeToSystem(theme);
    }
  }, [user?.settings?.preferences?.themeId, colorScheme, activeTheme.id]);

  return (
    <ThemeContext.Provider value={{ activeTheme, setThemeById }}>
      <MantineProvider theme={themeOverride}>{children}</MantineProvider>
    </ThemeContext.Provider>
  );
}

// Utility hook for other components to access theme colors
export function useThemeColors() {
  const { activeTheme } = useRavenDocsTheme();
  const { colorScheme } = useMantineColorScheme();

  return {
    primaryColor: activeTheme.primaryColor,
    secondaryColor: activeTheme.secondaryColor || "red",
    isDark: colorScheme === "dark",
  };
}
