import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconX, IconTrash } from "@tabler/icons-react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePageTabs } from "@/features/page/hooks/use-page-tabs";
import classes from "./page-tabs-bar.module.css";

export function PageTabsBar() {
  const { tabs, closeTab, clearTabs } = usePageTabs();
  const location = useLocation();
  const navigate = useNavigate();

  if (!tabs.length) {
    return null;
  }

  const activePath = location.pathname;

  return (
    <div className={classes.tabsBar}>
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
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
}
