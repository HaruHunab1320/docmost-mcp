import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePageTabs } from "@/features/page/hooks/use-page-tabs";
import classes from "./page-tabs-bar.module.css";
import { useEffect, useRef } from "react";

export function PageTabsBar() {
  const { tabs, closeTab, clearTabs } = usePageTabs();
  const location = useLocation();
  const navigate = useNavigate();
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const height = barRef.current?.offsetHeight || 0;
    document.documentElement.style.setProperty(
      "--page-tabs-height",
      `${height}px`
    );

    return () => {
      document.documentElement.style.setProperty("--page-tabs-height", "0px");
    };
  }, [tabs.length]);

  if (!tabs.length) {
    return null;
  }

  const activePath = location.pathname;

  return (
    <div className={classes.tabsBar} ref={barRef}>
      <div className={classes.tabsList}>
        {tabs.map((tab) => {
          const isActive = activePath === tab.url;
          return (
            <div
              key={tab.id}
              className={`${classes.tabItem} ${isActive ? classes.tabItemActive : ""}`}
              onClick={() => navigate(tab.url)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(tab.url);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {tab.icon ? <span>{tab.icon}</span> : null}
              <Text size="xs" className={classes.tabTitle}>
                {tab.title || "Untitled"}
              </Text>
              <ActionIcon
                size="xs"
                variant="subtle"
                className={classes.tabClose}
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(tab.id);
                }}
                aria-label="Close tab"
              >
                <IconX size={12} />
              </ActionIcon>
            </div>
          );
        })}
      </div>
      <Group gap={6} className={classes.tabsActions}>
        <Tooltip label="Close all tabs" withArrow>
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={clearTabs}
            aria-label="Close all tabs"
          >
            <IconX size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
}
