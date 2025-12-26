import { Group, Center, Text } from "@mantine/core";
import { Spotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@mantine/hooks";
import { usePageSearchQuery } from "@/features/search/queries/search-query";
import { buildPageUrl } from "@/features/page/page.utils.ts";
import { getPageIcon } from "@/lib";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";
import { projectService } from "@/features/project/services/project-service";
import { useAtom } from "jotai";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom";

interface SearchSpotlightProps {
  spaceId?: string;
}
export function SearchSpotlight({ spaceId }: SearchSpotlightProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedSearchQuery] = useDebouncedValue(query, 300);
  const [workspace] = useAtom(workspaceAtom);

  const {
    data: searchResults,
    isLoading,
    error,
  } = usePageSearchQuery({ query: debouncedSearchQuery, spaceId });

  const taskSearchQuery = useQuery({
    queryKey: ["task-search", spaceId, debouncedSearchQuery],
    queryFn: () =>
      projectService.listTasksBySpace({
        spaceId: spaceId || "",
        page: 1,
        limit: 5,
        searchTerm: debouncedSearchQuery,
      }),
    enabled: !!spaceId && debouncedSearchQuery.length > 0,
  });

  const memorySearchQuery = useQuery({
    queryKey: ["memory-search-spotlight", workspace?.id, spaceId, debouncedSearchQuery],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId: workspace?.id || "",
        spaceId,
        query: debouncedSearchQuery,
        limit: 5,
      }),
    enabled: !!workspace?.id && debouncedSearchQuery.length > 0,
  });

  const pages = (
    searchResults && searchResults.length > 0 ? searchResults : []
  ).map((page) => (
    <Spotlight.Action
      key={page.id}
      onClick={() =>
        navigate(buildPageUrl(page.space.slug, page.slugId, page.title))
      }
    >
      <Group wrap="nowrap" w="100%">
        <Center>{getPageIcon(page?.icon)}</Center>

        <div style={{ flex: 1 }}>
          <Text>{page.title}</Text>

          {page?.highlight && (
            <Text
              opacity={0.6}
              size="xs"
              dangerouslySetInnerHTML={{ __html: page.highlight }}
            />
          )}
        </div>
      </Group>
    </Spotlight.Action>
  ));

  const tasks = (taskSearchQuery.data?.items || []).map((task) => (
    <Spotlight.Action key={task.id}>
      <Group wrap="nowrap" w="100%">
        <Center>✅</Center>
        <div style={{ flex: 1 }}>
          <Text>{task.title}</Text>
          <Text opacity={0.6} size="xs">
            Task
          </Text>
        </div>
      </Group>
    </Spotlight.Action>
  ));

  const memories = (memorySearchQuery.data || []).map((memory) => (
    <Spotlight.Action key={memory.id}>
      <Group wrap="nowrap" w="100%">
        <Center>🧠</Center>
        <div style={{ flex: 1 }}>
          <Text>{memory.summary || "Memory"}</Text>
          <Text opacity={0.6} size="xs">
            Memory
          </Text>
        </div>
      </Group>
    </Spotlight.Action>
  ));

  return (
    <>
      <Spotlight.Root
        query={query}
        onQueryChange={setQuery}
        scrollable
        overlayProps={{
          backgroundOpacity: 0.55,
        }}
      >
        <Spotlight.Search
          placeholder={t("Search...")}
          leftSection={<IconSearch size={20} stroke={1.5} />}
        />
        <Spotlight.ActionsList>
          {query.length === 0 && pages.length === 0 && (
            <Spotlight.Empty>{t("Start typing to search...")}</Spotlight.Empty>
          )}

          {query.length > 0 &&
            pages.length === 0 &&
            tasks.length === 0 &&
            memories.length === 0 && (
            <Spotlight.Empty>{t("No results found...")}</Spotlight.Empty>
          )}

          {pages.length > 0 && pages}
          {tasks.length > 0 && tasks}
          {memories.length > 0 && memories}
        </Spotlight.ActionsList>
      </Spotlight.Root>
    </>
  );
}
