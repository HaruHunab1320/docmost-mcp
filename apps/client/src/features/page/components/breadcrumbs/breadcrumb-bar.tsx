import { Group } from "@mantine/core";
import classes from "./breadcrumb-bar.module.css";

interface BreadcrumbBarProps {
  children: React.ReactNode;
  right?: React.ReactNode;
}

export function BreadcrumbBar({ children, right }: BreadcrumbBarProps) {
  return (
    <div className={classes.bar}>
      <Group justify="space-between" h="100%" wrap="nowrap" w="100%">
        <Group justify="flex-start" h="100%" wrap="nowrap">
          {children}
        </Group>
        {right && (
          <Group justify="flex-end" h="100%" wrap="nowrap">
            {right}
          </Group>
        )}
      </Group>
    </div>
  );
}
