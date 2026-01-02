import { projectService } from "@/features/project/services/project-service";
import { TaskBucket } from "@/features/project/types";

const LEGACY_PREFIX = "ravendocs.taskBuckets.";

function getLegacyKey(spaceId: string) {
  return `${LEGACY_PREFIX}${spaceId}`;
}

export async function migrateLegacyBuckets(spaceId: string) {
  if (!spaceId || typeof window === "undefined") return;
  const storageKey = getLegacyKey(spaceId);
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return;

  let parsed: Record<string, TaskBucket> | null = null;
  try {
    parsed = JSON.parse(stored) as Record<string, TaskBucket>;
  } catch {
    return;
  }

  if (!parsed || !Object.keys(parsed).length) return;

  const entries = Object.entries(parsed).filter(
    ([, bucket]) => bucket === "waiting" || bucket === "someday"
  );

  if (!entries.length) {
    window.localStorage.removeItem(storageKey);
    return 0;
  }

  await Promise.all(
    entries.map(([taskId, bucket]) =>
      projectService.updateTask({ taskId, bucket })
    )
  );

  window.localStorage.removeItem(storageKey);
  return entries.length;
}
