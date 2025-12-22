import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/notifications/styles.css";
import "./global.css";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { mantineCssResolver, theme } from "@/theme";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import "./i18n";

// Create a client with aggressive real-time settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Ensure we always get fresh data
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // No stale time - always fetch fresh data
      staleTime: 0,
      // No automatic refetch interval (we'll handle this with WebSockets)
      refetchInterval: false,
      // Don't retry failed requests to avoid flickering
      retry: false,
      // In case of a background refetch error, don't revert to previous data
      retryOnMount: false,
      // Respond immediately to state changes
      notifyOnChangeProps: ["data", "error"],
    },
    mutations: {
      // Don't retry failed mutations
      retry: false,
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

// Create an extended theme that includes all our color palettes by default
const extendedTheme = {
  ...theme,
  defaultRadius: "md",
  // These will be overridden by the ThemeProvider
  primaryColor: "blue",
  // Use valid MantineColorShade values (0-9)
  primaryShade: { light: 6, dark: 8 } as const,
  // Additional configuration to ensure theme changes work properly
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
  },
};

// Add CSS variables for dynamic theme changes
const cssVariablesResolver = (theme) => {
  return {
    ...mantineCssResolver(theme),
    variables: {
      ...mantineCssResolver(theme).variables,
      "--mantine-primary-color-filled": `var(--mantine-color-${theme.primaryColor}-filled)`,
      "--mantine-primary-color-filled-hover": `var(--mantine-color-${theme.primaryColor}-filled-hover)`,
      "--mantine-primary-color-light": `var(--mantine-color-${theme.primaryColor}-light)`,
      "--mantine-primary-color-light-hover": `var(--mantine-color-${theme.primaryColor}-light-hover)`,
      "--mantine-primary-color-light-color": `var(--mantine-color-${theme.primaryColor}-light-color)`,
    },
    light: mantineCssResolver(theme).light,
    dark: mantineCssResolver(theme).dark,
  };
};

root.render(
  <BrowserRouter>
    <ColorSchemeScript defaultColorScheme="auto" />
    <MantineProvider
      theme={extendedTheme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <ModalsProvider>
        <QueryClientProvider client={queryClient}>
          <Notifications position="bottom-center" limit={3} />
          <HelmetProvider>
            <App />
          </HelmetProvider>
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  </BrowserRouter>
);
