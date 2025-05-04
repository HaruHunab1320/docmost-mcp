import {
  createTheme,
  CSSVariablesResolver,
  MantineColorsTuple,
} from "@mantine/core";

// Flag to track active theme
let activeThemeId = "default-light";

// Default DocMost blue
const blue: MantineColorsTuple = [
  "#e7f3ff",
  "#d0e4ff",
  "#a1c6fa",
  "#6ea6f6",
  "#458bf2",
  "#2b7af1",
  "#0b60d8",
  "#1b72f2",
  "#0056c1",
  "#004aac",
];

// Default DocMost red
const red: MantineColorsTuple = [
  "#ffebeb",
  "#fad7d7",
  "#eeadad",
  "#e3807f",
  "#da5a59",
  "#d54241",
  "#d43535",
  "#bc2727",
  "#a82022",
  "#93151b",
];

// Soothing Green
const green: MantineColorsTuple = [
  "#eafaef",
  "#d6f5de",
  "#a8eabc",
  "#76de99",
  "#4fd07e",
  "#38c86d",
  "#2bc365",
  "#1eac57",
  "#12964b",
  "#007f3e",
];

// Vibrant Purple
const purple: MantineColorsTuple = [
  "#f2e6ff",
  "#e3d0ff",
  "#c9a7fa",
  "#ad7df5",
  "#985df1",
  "#8c4ded",
  "#8644eb",
  "#7437d1",
  "#6830b7",
  "#57239e",
];

// Warm Orange
const orange: MantineColorsTuple = [
  "#fff2e6",
  "#ffe2cc",
  "#ffc599",
  "#ffa666",
  "#ff913d",
  "#ff8426",
  "#ff7d1a",
  "#e56600",
  "#cc5a00",
  "#b34e00",
];

// Teals and Cyan
const teal: MantineColorsTuple = [
  "#e6fff9",
  "#ccfff3",
  "#99ffe6",
  "#66ffd9",
  "#3dffcc",
  "#26ffbf",
  "#1affb3",
  "#00e69d",
  "#00cc8a",
  "#00b377",
];

// Project 89 Neon Green - Matrix-inspired terminal green
const neonGreen: MantineColorsTuple = [
  "#e6fff0", // Lightest neon green
  "#ccffe0", // Very light neon green
  "#99ffbb", // Light neon green
  "#66ff99", // Medium-light neon green
  "#33ff77", // Medium neon green
  "#00ff55", // Bright neon green - The iconic Matrix green
  "#00cc44", // Primary neon green
  "#009933", // Dark neon green
  "#006622", // Very dark neon green
  "#003311", // Darkest neon green
];

// Project 89 Electric Blue - Tron-inspired glowing blue
const electricBlue: MantineColorsTuple = [
  "#e6f9ff", // Lightest electric blue
  "#ccf2ff", // Very light electric blue
  "#99e6ff", // Light electric blue
  "#66d9ff", // Medium-light electric blue
  "#33ccff", // Medium electric blue
  "#00bfff", // Medium-dark electric blue
  "#0099ff", // Primary electric blue - Tron-like glow
  "#0077cc", // Dark electric blue
  "#005599", // Very dark electric blue
  "#003366", // Darkest electric blue
];

// Project 89 Terminal Black - Deep blacks for terminal aesthetics
const terminalBlack: MantineColorsTuple = [
  "#8c8c8c", // Lightest terminal (not actual black, but dark gray)
  "#737373", // Very light terminal
  "#595959", // Light terminal
  "#404040", // Medium-light terminal
  "#333333", // Medium terminal
  "#262626", // Medium-dark terminal
  "#1a1a1a", // Primary terminal black
  "#121212", // Dark terminal
  "#0d0d0d", // Very dark terminal
  "#000000", // Darkest terminal
];

// Project 89 Glitch Purple - Digital distortion purple
const glitchPurple: MantineColorsTuple = [
  "#f7e6ff", // Lightest glitch purple
  "#eeccff", // Very light glitch purple
  "#dc99ff", // Light glitch purple
  "#cc66ff", // Medium-light glitch purple
  "#bb33ff", // Medium glitch purple
  "#aa00ff", // Medium-dark glitch purple
  "#9900e6", // Primary glitch purple
  "#7700b3", // Dark glitch purple
  "#550080", // Very dark glitch purple
  "#33004d", // Darkest glitch purple
];

// Theme interface for our custom themes
export interface DocmostTheme {
  id: string;
  name: string;
  description: string;
  primaryColor:
    | "blue"
    | "green"
    | "purple"
    | "orange"
    | "teal"
    | "neonGreen"
    | "electricBlue"
    | "terminalBlack"
    | "glitchPurple";
  secondaryColor?:
    | "red"
    | "green"
    | "blue"
    | "purple"
    | "orange"
    | "teal"
    | "neonGreen"
    | "electricBlue"
    | "terminalBlack"
    | "glitchPurple";
  isDark?: boolean;
  fontFamily?: string;
  headingFontFamily?: string;
}

// Available themes
export const DOCMOST_THEMES: DocmostTheme[] = [
  {
    id: "default-light",
    name: "Default Light",
    description: "The default DocMost light theme",
    primaryColor: "blue",
    secondaryColor: "red",
    isDark: false,
  },
  {
    id: "default-dark",
    name: "Default Dark",
    description: "The default DocMost dark theme",
    primaryColor: "blue",
    secondaryColor: "red",
    isDark: true,
  },
  {
    id: "green-light",
    name: "Emerald Light",
    description: "A calming green theme",
    primaryColor: "green",
    secondaryColor: "orange",
    isDark: false,
  },
  {
    id: "green-dark",
    name: "Emerald Dark",
    description: "A calming green theme in dark mode",
    primaryColor: "green",
    secondaryColor: "orange",
    isDark: true,
  },
  {
    id: "purple-light",
    name: "Amethyst Light",
    description: "A creative purple theme",
    primaryColor: "purple",
    secondaryColor: "teal",
    isDark: false,
  },
  {
    id: "purple-dark",
    name: "Amethyst Dark",
    description: "A creative purple theme in dark mode",
    primaryColor: "purple",
    secondaryColor: "teal",
    isDark: true,
  },
  {
    id: "orange-light",
    name: "Amber Light",
    description: "A warm, energetic theme",
    primaryColor: "orange",
    secondaryColor: "blue",
    isDark: false,
  },
  {
    id: "orange-dark",
    name: "Amber Dark",
    description: "A warm, energetic theme in dark mode",
    primaryColor: "orange",
    secondaryColor: "blue",
    isDark: true,
  },
  {
    id: "teal-light",
    name: "Aqua Light",
    description: "A fresh, cool theme",
    primaryColor: "teal",
    secondaryColor: "purple",
    isDark: false,
  },
  {
    id: "teal-dark",
    name: "Aqua Dark",
    description: "A fresh, cool theme in dark mode",
    primaryColor: "teal",
    secondaryColor: "purple",
    isDark: true,
  },
  // Project 89 Themes
  {
    id: "project89-matrix",
    name: "Project 89 Matrix",
    description: "Hacker aesthetic with Matrix-inspired terminal green",
    primaryColor: "neonGreen",
    secondaryColor: "glitchPurple",
    isDark: true,
    headingFontFamily: "'Orbitron', sans-serif",
    fontFamily: "'Share Tech Mono', 'Courier New', monospace",
  },
  {
    id: "project89-tron",
    name: "Project 89 Tron",
    description: "Cyberpunk theme with Tron-inspired glowing blue",
    primaryColor: "electricBlue",
    secondaryColor: "neonGreen",
    isDark: true,
    headingFontFamily: "'Orbitron', sans-serif",
    fontFamily: "'VT323', 'Courier New', monospace",
  },
];

// Function to get a theme by ID
export const getThemeById = (themeId: string): DocmostTheme => {
  const theme = DOCMOST_THEMES.find((theme) => theme.id === themeId);
  if (!theme) {
    console.warn(`Theme ${themeId} not found, using default theme`);
    return DOCMOST_THEMES[0];
  }
  return theme;
};

// Function to get the active theme ID
export const getActiveThemeId = (): string => {
  return activeThemeId;
};

// Function to set the active theme ID
export const setActiveThemeId = (themeId: string): void => {
  activeThemeId = themeId;

  // Also update document root properties
  const theme = getThemeById(themeId);
  document.documentElement.setAttribute("data-theme", themeId);
  document.documentElement.setAttribute(
    "data-theme-primary",
    theme.primaryColor
  );
  document.documentElement.setAttribute(
    "data-theme-secondary",
    theme.secondaryColor || "red"
  );
};

// Base theme with all color definitions
export const theme = createTheme({
  primaryColor: "blue",
  colors: {
    blue,
    red,
    green,
    purple,
    orange,
    teal,
    neonGreen,
    electricBlue,
    terminalBlack,
    glitchPurple,
  },

  // Increase font sizes for better readability
  fontSizes: {
    xs: "0.85rem", // 13.6px - slightly larger than default
    sm: "0.95rem", // 15.2px - more readable small text
    md: "1.05rem", // 16.8px - increased for better readability
    lg: "1.15rem", // 18.4px - larger text
    xl: "1.35rem", // 21.6px - larger headlines
  },

  components: {
    Button: {
      defaultProps: {
        variant: "filled",
      },
    },
    ActionIcon: {
      defaultProps: {
        variant: "subtle",
      },
    },
    // Increase text size for Input descriptions and labels
    Input: {
      styles: {
        description: {
          fontSize: "var(--mantine-font-size-sm)", // Larger description text
        },
        label: {
          fontSize: "var(--mantine-font-size-sm)", // Larger labels
        },
      },
    },
    // Increase text size for Tabs
    Tabs: {
      styles: {
        tab: {
          fontSize: "var(--mantine-font-size-sm)", // Larger tab labels
        },
      },
    },
    // Increase text size for Select components
    Select: {
      styles: {
        label: {
          fontSize: "var(--mantine-font-size-sm)",
        },
        description: {
          fontSize: "var(--mantine-font-size-sm)",
        },
      },
    },
    // Make MultiSelect text larger
    MultiSelect: {
      styles: {
        label: {
          fontSize: "var(--mantine-font-size-sm)",
        },
        description: {
          fontSize: "var(--mantine-font-size-sm)",
        },
      },
    },
  },
});

export const mantineCssResolver: CSSVariablesResolver = (theme) => ({
  variables: {
    "--mantine-input-error-size": theme.fontSizes.sm,
    "--docmost-primary-color": `var(--mantine-color-${theme.primaryColor}-filled)`,
    "--docmost-primary-hover": `var(--mantine-color-${theme.primaryColor}-filled-hover)`,
    "--docmost-primary-light": `var(--mantine-color-${theme.primaryColor}-light)`,
    "--docmost-primary-light-hover": `var(--mantine-color-${theme.primaryColor}-light-hover)`,
    // Add new text size variables
    "--docmost-text-size-small": theme.fontSizes.sm,
    "--docmost-text-size-description": theme.fontSizes.sm,
  },
  light: {},
  dark: {},
});
