import { AppShell, Container } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SettingsSidebar from "@/components/settings/settings-sidebar.tsx";
import { useAtom } from "jotai";
import {
  asideStateAtom,
  desktopSidebarAtom,
  mobileSidebarAtom,
  sidebarWidthAtom,
} from "@/components/layouts/global/hooks/atoms/sidebar-atom.ts";
import { SpaceSidebar } from "@/features/space/components/sidebar/space-sidebar.tsx";
import { ProjectSidebar } from "@/features/project/components/project-sidebar";
import { AppHeader } from "@/components/layouts/global/app-header.tsx";
import Aside from "@/components/layouts/global/aside.tsx";
import classes from "./app-shell.module.css";
import { useTrialEndAction } from "@/ee/hooks/use-trial-end-action.tsx";
import { AgentChatDrawer } from "@/features/agent/components/agent-chat-drawer";
import { PageTabsBar } from "@/components/layouts/global/page-tabs-bar";
import { useMediaQuery } from "@mantine/hooks";
import { AttachmentPreviewModal } from "@/features/attachment/components/attachment-preview-modal";

export default function GlobalAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  useTrialEndAction();
  const [mobileOpened, setMobileOpened] = useAtom(mobileSidebarAtom);
  const [desktopOpened] = useAtom(desktopSidebarAtom);
  const [{ isAsideOpen }] = useAtom(asideStateAtom);
  const [sidebarWidth, setSidebarWidth] = useAtom(sidebarWidthAtom);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 48em)");

  const startResizing = React.useCallback((mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent) => {
      if (isResizing) {
        const newWidth =
          mouseMoveEvent.clientX -
          sidebarRef.current.getBoundingClientRect().left;
        if (newWidth < 220) {
          setSidebarWidth(220);
          return;
        }
        if (newWidth > 600) {
          setSidebarWidth(600);
          return;
        }
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    //https://codesandbox.io/p/sandbox/kz9de
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const location = useLocation();
  const locationKey = `${location.pathname}${location.search}`;
  const isSettingsRoute = location.pathname.startsWith("/settings");
  const isFilesRoute = location.pathname.startsWith("/files");
  const hasFilesSpaceId =
    isFilesRoute && new URLSearchParams(location.search).has("spaceId");
  const isSpaceRoute =
    location.pathname.startsWith("/s/") ||
    location.pathname.startsWith("/spaces/") ||
    hasFilesSpaceId;
  const isProjectRoute = location.pathname.includes("/projects");
  const isHomeRoute = location.pathname.startsWith("/home");
  const isPageRoute = location.pathname.includes("/p/");

  const prevLocationRef = useRef(locationKey);

  useEffect(() => {
    const prevLocation = prevLocationRef.current;
    if (prevLocation !== locationKey) {
      prevLocationRef.current = locationKey;
      if (isMobile && mobileOpened) {
        setMobileOpened(false);
      }
    }
  }, [isMobile, locationKey, mobileOpened, setMobileOpened]);

  return (
    <AppShell
      header={{ height: 45 }}
      navbar={
        !isHomeRoute && {
          width: isSpaceRoute ? sidebarWidth : 300,
          breakpoint: "sm",
          collapsed: {
            mobile: !mobileOpened,
            desktop: !desktopOpened,
          },
        }
      }
      aside={
        isPageRoute && {
          width: 350,
          breakpoint: "sm",
          collapsed: { mobile: !isAsideOpen, desktop: !isAsideOpen },
        }
      }
      padding="md"
    >
      <AppShell.Header px="xs" className={classes.header}>
        <AppHeader />
      </AppShell.Header>
      {!isHomeRoute && <PageTabsBar />}
      {!isHomeRoute && (
        <AppShell.Navbar
          className={classes.navbar}
          withBorder={false}
          ref={sidebarRef}
        >
          <div className={classes.resizeHandle} onMouseDown={startResizing} />
          {isSpaceRoute && !isProjectRoute && <SpaceSidebar />}
          {isProjectRoute && (
            <ProjectSidebar
              spaceId={location.pathname.split("/")[2]}
              activeProjectId={
                location.search.includes("projectId=")
                  ? new URLSearchParams(location.search).get("projectId")
                  : null
              }
              onSelectProject={(project) => {
                navigate(
                  `/spaces/${location.pathname.split("/")[2]}/projects?projectId=${project.id}`
                );
              }}
            />
          )}
          {isSettingsRoute && <SettingsSidebar />}
        </AppShell.Navbar>
      )}
      <AppShell.Main className={classes.main}>
        {isSettingsRoute ? (
          <Container size={800} key={location.pathname}>
            {children}
          </Container>
        ) : (
          children
        )}
      </AppShell.Main>

      {isPageRoute && (
        <AppShell.Aside className={classes.aside} p="md" withBorder={false}>
          <Aside />
        </AppShell.Aside>
      )}
      <AgentChatDrawer />
      <AttachmentPreviewModal />
    </AppShell>
  );
}
