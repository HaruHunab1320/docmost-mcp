import { useEffect, useMemo, useState } from "react";
import { useTasksBySpace } from "@/features/project/hooks/use-tasks";
import { Task } from "@/features/project/types";

interface UsePagedSpaceTasksOptions {
  limit?: number;
  autoLoadAll?: boolean;
}

export function usePagedSpaceTasks(
  spaceId: string,
  options: UsePagedSpaceTasksOptions = {}
) {
  const limit = options.limit ?? 200;
  const autoLoadAll = options.autoLoadAll ?? false;
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Task[]>([]);
  const [autoLoading, setAutoLoading] = useState(false);

  const query = useTasksBySpace({
    spaceId,
    page,
    limit,
  });

  useEffect(() => {
    if (!spaceId) return;
    setPage(1);
    setItems([]);
    setAutoLoading(autoLoadAll);
  }, [autoLoadAll, spaceId]);

  useEffect(() => {
    if (!query.data) return;
    setItems((prev) =>
      page === 1 ? query.data.items || [] : [...prev, ...(query.data.items || [])]
    );

    if (autoLoadAll && query.data.meta?.hasNextPage) {
      setPage((prev) => prev + 1);
    }
    if (autoLoadAll && !query.data.meta?.hasNextPage) {
      setAutoLoading(false);
    }
  }, [autoLoadAll, page, query.data]);

  const hasNextPage = Boolean(query.data?.meta?.hasNextPage);
  const isLoading = query.isLoading || autoLoading;

  const loadMore = () => {
    if (hasNextPage) {
      setPage((prev) => prev + 1);
    }
  };

  return useMemo(
    () => ({
      items,
      isLoading,
      hasNextPage,
      loadMore,
    }),
    [hasNextPage, isLoading, items]
  );
}
