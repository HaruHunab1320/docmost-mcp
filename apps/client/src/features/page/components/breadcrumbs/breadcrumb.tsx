import { useAtomValue } from "jotai";
import { treeDataAtom } from "@/features/page/tree/atoms/tree-data-atom.ts";
import React, { useEffect, useState } from "react";
import { findBreadcrumbPath } from "@/features/page/tree/utils";
import {
  Button,
  Anchor,
  Popover,
  Breadcrumbs,
  ActionIcon,
  Text,
} from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { Link, useParams } from "react-router-dom";
import classes from "./breadcrumb.module.css";
import { SpaceTreeNode } from "@/features/page/tree/types.ts";
import { buildPageUrl } from "@/features/page/page.utils.ts";
import { usePageQuery } from "@/features/page/queries/page-query.ts";
import { extractPageSlugId } from "@/lib";
import APP_ROUTE from "@/lib/app-route";

function getTitle(name: string, icon: string) {
  if (icon) {
    return `${icon} ${name}`;
  }
  return name;
}

interface BreadcrumbProps {
  onHasBreadcrumbsChange?: (hasBreadcrumbs: boolean) => void;
}

export default function Breadcrumb({ onHasBreadcrumbsChange }: BreadcrumbProps) {
  const treeData = useAtomValue(treeDataAtom);
  const [breadcrumbNodes, setBreadcrumbNodes] = useState<
    SpaceTreeNode[] | null
  >(null);
  const { pageSlug, spaceSlug } = useParams();
  const { data: currentPage } = usePageQuery({
    pageId: extractPageSlugId(pageSlug),
  });

  useEffect(() => {
    if (treeData?.length > 0 && currentPage) {
      const breadcrumb = findBreadcrumbPath(treeData, currentPage.id);
      setBreadcrumbNodes(breadcrumb || null);
    }
  }, [currentPage?.id, treeData]);

  const HiddenNodesTooltipContent = () =>
    breadcrumbNodes?.slice(1, -2).map((node) => (
      <Button.Group orientation="vertical" key={node.id}>
        <Button
          justify="start"
          component={Link}
          to={buildPageUrl(spaceSlug, node.slugId, node.name)}
          variant="default"
          style={{ border: "none" }}
        >
          <Text fz={"sm"} className={classes.truncatedText}>
            {getTitle(node.name, node.icon)}
          </Text>
        </Button>
      </Button.Group>
    ));

  const renderAnchor = (node: SpaceTreeNode) => (
    <Anchor
      component={Link}
      to={buildPageUrl(spaceSlug, node.slugId, node.name)}
      underline="never"
      fz={"sm"}
      key={node.id}
      className={classes.truncatedText}
    >
      {getTitle(node.name, node.icon)}
    </Anchor>
  );

  const breadcrumbItems = React.useMemo(() => {
    if (!breadcrumbNodes) return [];
    const spaceHome = spaceSlug
      ? APP_ROUTE.SPACE.HOME(spaceSlug)
      : APP_ROUTE.HOME;

    if (breadcrumbNodes.length <= 1) {
      return [
        <Anchor
          key="space-home"
          component={Link}
          to={spaceHome}
          underline="never"
          fz={"sm"}
          className={classes.truncatedText}
        >
          ..
        </Anchor>,
      ];
    }

    if (breadcrumbNodes.length > 3) {
      const firstNode = breadcrumbNodes[0];
      const secondLastNode = breadcrumbNodes[breadcrumbNodes.length - 2];
      const lastNode = breadcrumbNodes[breadcrumbNodes.length - 1];

      return [
        renderAnchor(firstNode),
        <Popover
          width={250}
          position="bottom"
          withArrow
          shadow="xl"
          key="hidden-nodes"
        >
          <Popover.Target>
            <ActionIcon color="gray" variant="transparent">
              <IconDots size={20} stroke={2} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown>
            <HiddenNodesTooltipContent />
          </Popover.Dropdown>
        </Popover>,
        renderAnchor(secondLastNode),
        renderAnchor(lastNode),
      ];
    }

    return breadcrumbNodes.slice(0, -1).map(renderAnchor);
  }, [breadcrumbNodes, spaceSlug]);


  if (!breadcrumbItems.length) return null;

  return (
    <div style={{ overflow: "hidden" }}>
      <Breadcrumbs className={classes.breadcrumbs}>
        {breadcrumbItems}
      </Breadcrumbs>
    </div>
  );
}
