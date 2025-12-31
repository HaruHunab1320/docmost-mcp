import {
  Text,
  Group,
  UnstyledButton,
  Badge,
  Table,
  ActionIcon,
  Stack,
} from '@mantine/core';
import {Link} from 'react-router-dom';
import PageListSkeleton from '@/components/ui/page-list-skeleton.tsx';
import { buildPageUrl } from '@/features/page/page.utils.ts';
import { formattedDate } from '@/lib/time.ts';
import { useRecentChangesQuery } from '@/features/page/queries/page-query.ts';
import { IconFileDescription } from '@tabler/icons-react';
import { getSpaceUrl } from '@/lib/config.ts';
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@mantine/hooks";
import classes from "./recent-changes.module.css";

interface Props {
  spaceId?: string;
}

export default function RecentChanges({spaceId}: Props) {
  const { t } = useTranslation();
  const {data: pages, isLoading, isError} = useRecentChangesQuery(spaceId);
  const isMobile = useMediaQuery("(max-width: 48em)");

  if (isLoading) {
    return <PageListSkeleton/>;
  }

  if (isError) {
    return <Text>{t("Failed to fetch recent pages")}</Text>;
  }

  if (!pages || pages.items.length === 0) {
    return (
      <Text size="md" ta="center">
        {t("No pages yet")}
      </Text>
    );
  }

  if (isMobile) {
    return (
      <Stack gap="sm">
        {pages.items.map((page) => (
          <UnstyledButton
            key={page.id}
            component={Link}
            to={buildPageUrl(page?.space.slug, page.slugId, page.title)}
            className={classes.mobileItem}
          >
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Group wrap="nowrap" gap="xs">
                {page.icon || (
                  <ActionIcon variant="transparent" color="gray" size={18}>
                    <IconFileDescription size={18} />
                  </ActionIcon>
                )}
                <Text fw={500} size="sm" lineClamp={1}>
                  {page.title || t("Untitled")}
                </Text>
              </Group>
              <Text c="dimmed" size="xs" fw={500} className={classes.mobileDate}>
                {formattedDate(page.updatedAt)}
              </Text>
            </Group>
            {!spaceId ? (
              <Text size="xs" c="dimmed" className={classes.mobileMeta}>
                {page?.space.name}
              </Text>
            ) : null}
          </UnstyledButton>
        ))}
      </Stack>
    );
  }

  return (
    <Table.ScrollContainer minWidth={0}>
      <Table highlightOnHover verticalSpacing="sm">
        <Table.Tbody>
          {pages.items.map((page) => (
            <Table.Tr key={page.id}>
              <Table.Td>
                <UnstyledButton
                  component={Link}
                  to={buildPageUrl(page?.space.slug, page.slugId, page.title)}
                >
                  <Group wrap="nowrap">
                    {page.icon || (
                      <ActionIcon variant='transparent' color='gray' size={18}>
                        <IconFileDescription size={18}/>
                      </ActionIcon>
                    )}

                    <Text fw={500} size="md" lineClamp={1}>
                      {page.title || t("Untitled")}
                    </Text>
                  </Group>
                </UnstyledButton>
              </Table.Td>
              {!spaceId && (
                <Table.Td>
                  <Badge
                    color="blue"
                    variant="light"
                    component={Link}
                    to={getSpaceUrl(page?.space.slug)}
                    style={{cursor: 'pointer'}}
                  >
                    {page?.space.name}
                  </Badge>
                </Table.Td>
              )}
              <Table.Td>
                <Text c="dimmed" style={{whiteSpace: 'nowrap'}} size="xs" fw={500}>
                  {formattedDate(page.updatedAt)}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
