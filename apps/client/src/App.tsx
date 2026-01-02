import { Navigate, Route, Routes } from "react-router-dom";
import SetupWorkspace from "@/pages/auth/setup-workspace.tsx";
import LoginPage from "@/pages/auth/login";
import Home from "@/pages/dashboard/home";
import Page from "@/pages/page/page";
import AccountSettings from "@/pages/settings/account/account-settings";
import WorkspaceMembers from "@/pages/settings/workspace/workspace-members";
import WorkspaceSettings from "@/pages/settings/workspace/workspace-settings";
import Groups from "@/pages/settings/group/groups";
import GroupInfo from "./pages/settings/group/group-info";
import Spaces from "@/pages/settings/space/spaces.tsx";
import { Error404 } from "@/components/ui/error-404.tsx";
import AccountPreferences from "@/pages/settings/account/account-preferences.tsx";
import SpaceHome from "@/pages/space/space-home.tsx";
import PageRedirect from "@/pages/page/page-redirect.tsx";
import Layout from "@/components/layouts/global/layout.tsx";
import { ErrorBoundary } from "react-error-boundary";
import InviteSignup from "@/pages/auth/invite-signup.tsx";
import ForgotPassword from "@/pages/auth/forgot-password.tsx";
import PasswordReset from "./pages/auth/password-reset";
import Billing from "@/ee/billing/pages/billing.tsx";
import CloudLogin from "@/ee/pages/cloud-login.tsx";
import CreateWorkspace from "@/ee/pages/create-workspace.tsx";
import { isCloud } from "@/lib/config.ts";
import { useTranslation } from "react-i18next";
import Security from "@/ee/security/pages/security.tsx";
import License from "@/ee/licence/pages/license.tsx";
import { useRedirectToCloudSelect } from "@/ee/hooks/use-redirect-to-cloud-select.tsx";
import AttachmentsPage from "@/features/attachment/pages/attachments-page.tsx";
import { useMCPEvents } from "@/features/websocket/hooks/use-mcp-events";
import NavigationTestPage from "@/features/websocket/pages/navigation-test-page.tsx";
import { ProjectManagementPage } from "@/features/project/pages/project-management-page.tsx";
import { TasksPage } from "@/features/project/pages/tasks-page.tsx";
import { InboxPage } from "@/features/gtd/pages/inbox-page";
import { TodayPage } from "@/features/gtd/pages/today-page";
import { TriagePage } from "@/features/gtd/pages/triage-page";
import { ReviewPage } from "@/features/gtd/pages/review-page";
import { WaitingPage } from "@/features/gtd/pages/waiting-page";
import { SomedayPage } from "@/features/gtd/pages/someday-page";
import { MemoryInsightsPage } from "@/features/agent-memory/pages/memory-insights-page";
import ApiKeys from "@/pages/settings/workspace/api-keys.tsx";
import { useEffect } from "react";

// CSS for Project 89 themes
const project89CSS = `
  /* Core Font Imports */
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
  
  /* Animations */
  @keyframes scanline {
    0% {
      transform: translateY(-100%);
    }
    100% {
      transform: translateY(100%);
    }
  }
  
  @keyframes horizontalScanline {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  /* Background effects for the entire page */
  [data-theme^="project89"] body {
    position: relative;
    background-color: var(--raven-docs-body-bg);
  }
  
  /* Grid lines are removed for both themes */
  [data-theme^="project89"] body::before {
    display: none;
  }
  
  /* Add scanlines overlay for Matrix theme - made more subtle */
  [data-theme="project89-matrix"] body::after {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      transparent 0%,
      rgba(0, 255, 65, 0.08) 50%,
      transparent 100%
    );
    background-size: 100% 4px;
    pointer-events: none;
    z-index: -2; /* Position behind all content */
  }
  
  /* Tron blue scan lines - made more subtle */
  [data-theme="project89-tron"] body::after {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      transparent 0%,
      rgba(30, 143, 255, 0.08) 50%,
      transparent 100%
    );
    background-size: 100% 4px;
    pointer-events: none;
    z-index: -2; /* Position behind all content */
  }
  
  /* Matrix theme styles */
  [data-theme="project89-matrix"] {
    --terminal-font: 'Share Tech Mono', 'Courier New', monospace;
    --header-font: 'Orbitron', sans-serif;
    --matrix-glow: 0 0 5px var(--mantine-color-neonGreen-5), 0 0 10px var(--mantine-color-neonGreen-5);
  }
  
  /* Add some transparency to cards to let the background effects show through */
  [data-theme^="project89"] .mantine-Card-root {
    background-color: rgba(18, 18, 20, 0.85);
    backdrop-filter: blur(2px);
    border: 1px solid rgba(40, 40, 45, 0.8);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
    transition: all 0.3s ease;
  }
  
  [data-theme^="project89"] .mantine-Card-root[data-hoverable="true"]:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.7);
    border-color: rgba(60, 60, 65, 0.9);
  }
  
  /* Content areas get a subtle glow */
  [data-theme^="project89"] .mantine-Paper-root {
    background-color: rgba(18, 18, 20, 0.85);
    backdrop-filter: blur(2px);
    border: 1px solid rgba(40, 40, 45, 0.8);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }
  
  /* Matrix specific card styles */
  [data-theme="project89-matrix"] .mantine-Card-root {
    background-color: rgba(15, 20, 15, 0.85);
    border: 1px solid rgba(0, 255, 65, 0.3);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0, 255, 65, 0.2);
  }
  
  [data-theme="project89-matrix"] .mantine-Card-root[data-hoverable="true"]:hover {
    border-color: rgba(0, 255, 65, 0.5);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.7), 0 0 16px rgba(0, 255, 65, 0.3);
  }
  
  [data-theme="project89-matrix"] .mantine-Paper-root {
    background-color: rgba(15, 20, 15, 0.85);
    border: 1px solid rgba(0, 255, 65, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 255, 65, 0.15);
  }
  
  /* Project swimlane styling */
  [data-theme^="project89"] .project-swimlane-container {
    background-color: rgba(18, 18, 20, 0.85) !important;
    backdrop-filter: blur(2px);
    border: 1px solid rgba(40, 40, 45, 0.8);
  }
  
  [data-theme="project89-matrix"] .project-swimlane-container {
    background-color: rgba(15, 20, 15, 0.85) !important;
    border: 1px solid rgba(0, 255, 65, 0.2);
  }
  
  /* Tron theme styles */
  [data-theme="project89-tron"] {
    --terminal-font: 'VT323', 'Courier New', monospace;
    --header-font: 'Orbitron', sans-serif;
    --tron-glow: 0 0 5px var(--mantine-color-electricBlue-5), 0 0 10px var(--mantine-color-electricBlue-5);
  }
  
  [data-theme="project89-tron"] .mantine-Button-root {
    font-family: var(--header-font);
    text-transform: uppercase;
    letter-spacing: 1px;
    border: 1px solid var(--mantine-color-electricBlue-5);
    box-shadow: 0 0 5px var(--mantine-color-electricBlue-5);
  }
  
  /* Remove button scan line effect */
  [data-theme="project89-tron"] .mantine-Button-root:hover::before {
    display: none;
  }
  
  /* Common Project 89 terminal-style elements */
  [data-theme^="project89"] .mantine-Code-root,
  [data-theme^="project89"] code,
  [data-theme^="project89"] pre {
    font-family: var(--terminal-font);
    border: 1px solid var(--mantine-primary-color-filled);
    background-color: rgba(0, 0, 0, 0.8);
    box-shadow: 0 0 5px var(--mantine-primary-color-filled);
  }
  
  /* Navigation and tabs get the cyberpunk treatment */
  [data-theme^="project89"] .mantine-Tabs-tab {
    font-family: var(--header-font);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  [data-theme^="project89"] .mantine-NavLink-root {
    font-family: var(--terminal-font);
  }
  
  /* Loading indicators get a cyberpunk treatment */
  [data-theme^="project89"] .mantine-Loader-root {
    box-shadow: 0 0 15px var(--mantine-primary-color-filled);
  }
  
  /* Remove the occasional glitch effect on hover */
  [data-theme^="project89"] .mantine-Title-root:hover,
  [data-theme^="project89"] h1:hover,
  [data-theme^="project89"] .mantine-Button-root:hover {
    animation: none;
  }
  
  /* Headers get a special terminal-like effect */
  [data-theme^="project89"] .mantine-AppShell-header,
  [data-theme^="project89"] .mantine-Navbar-root {
    border: 1px solid var(--mantine-primary-color-filled);
    box-shadow: 0 0 10px var(--mantine-primary-color-filled);
    background-color: rgba(0, 0, 0, 0.85);
  }

  /* Add moving horizontal scanline effect for the entire page - made more subtle */
  [data-theme="project89-matrix"] #horizontal-scanline {
    position: fixed;
    top: 50%;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(var(--mantine-color-neonGreen-filled-rgb), 0.3),
      transparent
    );
    z-index: 0; /* Behind content but above background */
    pointer-events: none;
    opacity: 0.3;
    animation: horizontalScanline 20s linear infinite; /* Slower animation */
  }
  
  [data-theme="project89-tron"] #horizontal-scanline {
    position: fixed;
    top: 50%;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(var(--mantine-color-electricBlue-filled-rgb), 0.3),
      transparent
    );
    z-index: 0; /* Behind content but above background */
    pointer-events: none;
    opacity: 0.3;
    animation: horizontalScanline 20s linear infinite; /* Slower animation */
  }

  /* Text inputs get the terminal treatment */
  [data-theme^="project89"] .mantine-TextInput-input,
  [data-theme^="project89"] .mantine-Textarea-input,
  [data-theme^="project89"] .mantine-PasswordInput-input {
    font-family: var(--terminal-font);
    background-color: rgba(0, 0, 0, 0.6);
    border: 1px solid var(--mantine-primary-color-filled);
    box-shadow: 0 0 5px var(--mantine-primary-color-filled);
  }

  /* Tron specific card styles */
  [data-theme="project89-tron"] .mantine-Card-root {
    background-color: rgba(15, 15, 25, 0.85);
    border: 1px solid rgba(30, 143, 255, 0.3);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 12px rgba(30, 143, 255, 0.2);
  }
  
  [data-theme="project89-tron"] .mantine-Card-root[data-hoverable="true"]:hover {
    border-color: rgba(30, 143, 255, 0.5);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.7), 0 0 16px rgba(30, 143, 255, 0.3);
  }
  
  [data-theme="project89-tron"] .mantine-Paper-root {
    background-color: rgba(15, 15, 25, 0.85);
    border: 1px solid rgba(30, 143, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 10px rgba(30, 143, 255, 0.15);
  }
  
  /* Remove the scan line effect from cards */
  [data-theme^="project89"] .mantine-Card-root::before,
  [data-theme^="project89"] .mantine-Card-root::after {
    display: none;
  }
  
  /* Add section styling */
  [data-theme^="project89"] section, 
  [data-theme^="project89"] .mantine-Container-root,
  [data-theme^="project89"] .mantine-Group-root > div {
    position: relative;
    z-index: 1;
  }
  
  /* Matrix theme typography styles */
  [data-theme="project89-matrix"] .mantine-Title-root,
  [data-theme="project89-matrix"] h1,
  [data-theme="project89-matrix"] h2,
  [data-theme="project89-matrix"] h3,
  [data-theme="project89-matrix"] h4 {
    font-family: var(--header-font);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    text-shadow: 0 0 4px var(--mantine-color-neonGreen-5);
  }
  
  [data-theme="project89-matrix"] .mantine-Button-root {
    font-family: var(--header-font);
    text-transform: uppercase;
    letter-spacing: 1px;
    border: 1px solid var(--mantine-color-neonGreen-5);
    box-shadow: 0 0 5px var(--mantine-color-neonGreen-5);
  }
  
  [data-theme="project89-matrix"] .mantine-Text-root {
    font-family: var(--terminal-font);
  }
  
  /* Tron theme typography styles */
  [data-theme="project89-tron"] .mantine-Title-root,
  [data-theme="project89-tron"] h1,
  [data-theme="project89-tron"] h2,
  [data-theme="project89-tron"] h3,
  [data-theme="project89-tron"] h4 {
    font-family: var(--header-font);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    text-shadow: 0 0 4px var(--mantine-color-electricBlue-5);
  }
  
  [data-theme="project89-tron"] .mantine-Text-root {
    font-family: var(--terminal-font);
  }

  /* Project swimlane styling */
  [data-theme="project89-tron"] .project-swimlane-container {
    background-color: rgba(15, 15, 25, 0.85) !important;
    border: 1px solid rgba(30, 143, 255, 0.2);
  }
`;

export default function App() {
  const { t } = useTranslation();
  useRedirectToCloudSelect();

  // Initialize MCP events handling (including navigation events)
  useMCPEvents();

  // Add Project 89 styles to the document
  useEffect(() => {
    // Add the style element if it doesn't exist
    if (!document.getElementById("project89-styles")) {
      const styleElement = document.createElement("style");
      styleElement.id = "project89-styles";
      styleElement.textContent = project89CSS;
      document.head.appendChild(styleElement);
    }

    return () => {
      // Cleanup on unmount
      const styleElement = document.getElementById("project89-styles");
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  // Add horizontal scanline for Project 89 themes
  useEffect(() => {
    // Function to check if the current theme is a Project 89 theme
    const checkAndUpdateScanline = () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const isProject89Theme =
        currentTheme && currentTheme.startsWith("project89");

      // Get or create the scanline element
      let scanlineElement = document.getElementById("horizontal-scanline");

      if (isProject89Theme) {
        // Create scanline if it doesn't exist
        if (!scanlineElement) {
          scanlineElement = document.createElement("div");
          scanlineElement.id = "horizontal-scanline";
          document.body.appendChild(scanlineElement);
        }
      } else {
        // Remove scanline if it exists and theme is not Project 89
        if (scanlineElement) {
          scanlineElement.remove();
        }
      }
    };

    // Run once on mount
    checkAndUpdateScanline();

    // Set up a MutationObserver to watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          checkAndUpdateScanline();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      // Cleanup - disconnect observer and remove scanline
      observer.disconnect();
      const scanlineElement = document.getElementById("horizontal-scanline");
      if (scanlineElement) {
        scanlineElement.remove();
      }
    };
  }, []);

  return (
    <>
      <Routes>
        <Route index element={<Navigate to="/home" />} />
        <Route path={"/login"} element={<LoginPage />} />
        <Route path={"/invites/:invitationId"} element={<InviteSignup />} />
        <Route path={"/forgot-password"} element={<ForgotPassword />} />
        <Route path={"/password-reset"} element={<PasswordReset />} />

        {!isCloud() && (
          <Route path={"/setup/register"} element={<SetupWorkspace />} />
        )}

        {isCloud() && (
          <>
            <Route path={"/create"} element={<CreateWorkspace />} />
            <Route path={"/select"} element={<CloudLogin />} />
          </>
        )}

        <Route path={"/p/:pageSlug"} element={<PageRedirect />} />

        <Route element={<Layout />}>
          <Route path={"/home"} element={<Home />} />
          <Route path={"/s/:spaceSlug/home"} element={<SpaceHome />} />
          <Route path={"/s/:spaceSlug/p/:pageSlug"} element={<Page />} />
          <Route
            path={"/s/:spaceId/projects"}
            element={<ProjectManagementPage />}
          />
          <Route
            path={"/spaces/:spaceId/projects"}
            element={<ProjectManagementPage />}
          />
          <Route path={"/spaces/:spaceId/tasks"} element={<TasksPage />} />
          <Route path={"/spaces/:spaceId/inbox"} element={<InboxPage />} />
          <Route path={"/spaces/:spaceId/today"} element={<TodayPage />} />
          <Route path={"/spaces/:spaceId/triage"} element={<TriagePage />} />
          <Route path={"/spaces/:spaceId/review"} element={<ReviewPage />} />
          <Route path={"/spaces/:spaceId/waiting"} element={<WaitingPage />} />
          <Route path={"/spaces/:spaceId/someday"} element={<SomedayPage />} />
          <Route
            path={"/spaces/:spaceId/insights"}
            element={<MemoryInsightsPage />}
          />
          <Route
            path={"/spaces/:spaceId/projects/:projectId/tasks"}
            element={<TasksPage />}
          />
          <Route path={"/files"} element={<AttachmentsPage />} />

          <Route
            path={"/settings/account/profile"}
            element={<AccountSettings />}
          />
          <Route
            path={"/settings/account/preferences"}
            element={<AccountPreferences />}
          />
          <Route path={"/settings/workspace"} element={<WorkspaceSettings />} />
          <Route path={"/settings/members"} element={<WorkspaceMembers />} />
          <Route path={"/settings/groups"} element={<Groups />} />
          <Route path={"/settings/groups/:groupId"} element={<GroupInfo />} />
          <Route path={"/settings/spaces"} element={<Spaces />} />
          <Route path={"/settings/api-keys"} element={<ApiKeys />} />
          <Route path={"/settings/billing"} element={<Billing />} />
          <Route path={"/settings/security"} element={<Security />} />
          <Route path={"/settings/license"} element={<License />} />
          <Route path={"/navigation-test"} element={<NavigationTestPage />} />
          <Route path={"*"} element={<Error404 />} />
        </Route>
      </Routes>
    </>
  );
}
