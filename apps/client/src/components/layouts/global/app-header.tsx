import { ActionIcon, Badge, Group, Text, Tooltip } from "@mantine/core";
import classes from "./app-header.module.css";
import React, { useEffect } from "react";
import TopMenu from "@/components/layouts/global/top-menu.tsx";
import { Link, useLocation } from "react-router-dom";
import APP_ROUTE from "@/lib/app-route.ts";
import { useAtom } from "jotai";
import {
  desktopSidebarAtom,
  mobileSidebarAtom,
  agentChatDrawerAtom,
} from "@/components/layouts/global/hooks/atoms/sidebar-atom.ts";
import { useToggleSidebar } from "@/components/layouts/global/hooks/hooks/use-toggle-sidebar.ts";
import SidebarToggle from "@/components/ui/sidebar-toggle-button.tsx";
import { useTranslation } from "react-i18next";
import useTrial from "@/ee/hooks/use-trial.tsx";
import { isCloud } from "@/lib/config.ts";
import { ThemeSwitcher } from "@/features/user/components/theme-switcher";
import { QuickCapture } from "@/features/gtd/components/quick-capture";
import { IconKeyboard, IconMessageChatbot } from "@tabler/icons-react";
// import { MCPEventIndicator } from "@/features/websocket/components/mcp-event-indicator.tsx";

const links = [
  { link: APP_ROUTE.HOME, label: "Home" },
  { link: APP_ROUTE.FILES, label: "Files" },
];

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["input", "textarea", "select"].includes(target.tagName.toLowerCase())
  );
}

export function AppHeader() {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileOpened] = useAtom(mobileSidebarAtom);
  const toggleMobile = useToggleSidebar(mobileSidebarAtom);

  const [desktopOpened] = useAtom(desktopSidebarAtom);
  const toggleDesktop = useToggleSidebar(desktopSidebarAtom);
  const [, setAgentChatOpened] = useAtom(agentChatDrawerAtom);
  const { isTrial, trialDaysLeft } = useTrial();

  const isHomeRoute = location.pathname === "/home";
  const isMac = React.useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  }, []);
  const captureShortcut = isMac ? "Cmd+K" : "Ctrl+K";
  const triageShortcut = isMac ? "Cmd+Shift+K" : "Ctrl+Shift+K";
  const chatShortcut = isMac ? "Cmd+Shift+A" : "Ctrl+Shift+A";
  const shortcutLabel = t("Shortcuts: {{items}}", {
    items: `${captureShortcut} capture, ${triageShortcut} triage, ${chatShortcut} agent chat`,
  });

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const spaceIdFromPath =
    pathSegments[0] === "spaces" ? pathSegments[1] : undefined;
  const spaceIdFromQuery = new URLSearchParams(location.search).get("spaceId");
  const currentSpaceId = spaceIdFromPath || spaceIdFromQuery || undefined;
  const filesLink = currentSpaceId
    ? `${APP_ROUTE.FILES}?spaceId=${currentSpaceId}`
    : APP_ROUTE.FILES;
  const headerLinks = links.map((link) => ({
    ...link,
    link: link.link === APP_ROUTE.FILES ? filesLink : link.link,
  }));

  const items = headerLinks.map((link) => (
    <Link key={link.label} to={link.link} className={classes.link}>
      {t(link.label)}
    </Link>
  ));

  const toggleAgentChat = () => setAgentChatOpened((opened) => !opened);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isEditableTarget(event.target)) return;
      const isModifier = isMac ? event.metaKey : event.ctrlKey;
      if (!isModifier || !event.shiftKey) return;
      if (event.key.toLowerCase() !== "a") return;
      event.preventDefault();
      setAgentChatOpened((opened) => !opened);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMac, setAgentChatOpened]);

  return (
    <>
      <Group h="100%" px="md" justify="space-between" wrap={"nowrap"}>
        <Group wrap="nowrap">
          {!isHomeRoute && (
            <>
              <Tooltip label={t("Sidebar toggle")}>
                <SidebarToggle
                  aria-label={t("Sidebar toggle")}
                  opened={mobileOpened}
                  onClick={toggleMobile}
                  hiddenFrom="sm"
                  size="sm"
                />
              </Tooltip>

              <Tooltip label={t("Sidebar toggle")}>
                <SidebarToggle
                  aria-label={t("Sidebar toggle")}
                  opened={desktopOpened}
                  onClick={toggleDesktop}
                  visibleFrom="sm"
                  size="sm"
                />
              </Tooltip>
            </>
          )}

          <Text
            size="lg"
            fw={600}
            style={{ cursor: "pointer", userSelect: "none" }}
            component={Link}
            to="/home"
          >
            Raven Docs
          </Text>

          <Group ml={50} gap={5} className={classes.links} visibleFrom="sm">
            {items}
          </Group>
        </Group>

        <Group wrap="nowrap">
          {!isHomeRoute && <QuickCapture />}
        </Group>

        <Group px={"xl"} wrap="nowrap">
          {isCloud() && isTrial && trialDaysLeft !== 0 && (
            <Badge
              variant="light"
              style={{ cursor: "pointer" }}
              component={Link}
              to={APP_ROUTE.SETTINGS.WORKSPACE.BILLING}
              visibleFrom="xs"
            >
              {trialDaysLeft === 1
                ? "1 day left"
                : `${trialDaysLeft} days left`}
            </Badge>
          )}
          <Tooltip label={shortcutLabel} withArrow position="bottom">
            <ActionIcon variant="subtle" size={30} aria-label={shortcutLabel}>
              <IconKeyboard size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t("Agent chat")} withArrow position="bottom">
            <ActionIcon
              variant="subtle"
              size={30}
              aria-label={t("Agent chat")}
              onClick={toggleAgentChat}
            >
              <IconMessageChatbot size={16} />
            </ActionIcon>
          </Tooltip>
          <ThemeSwitcher />
          {/* <MCPEventIndicator /> */}
          <TopMenu />
        </Group>
      </Group>
    </>
  );
}
