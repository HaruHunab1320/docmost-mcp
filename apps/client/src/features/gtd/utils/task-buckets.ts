export type TaskBucket = "waiting" | "someday";

function getStorageKey(spaceId: string) {
  return `docmost.taskBuckets.${spaceId}`;
}

export function getBucketMap(spaceId: string): Record<string, TaskBucket> {
  if (!spaceId) return {};
  const stored = localStorage.getItem(getStorageKey(spaceId));
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export function setTaskBucket(
  spaceId: string,
  taskId: string,
  bucket: TaskBucket
) {
  const map = getBucketMap(spaceId);
  map[taskId] = bucket;
  localStorage.setItem(getStorageKey(spaceId), JSON.stringify(map));
}

export function clearTaskBucket(spaceId: string, taskId: string) {
  const map = getBucketMap(spaceId);
  delete map[taskId];
  localStorage.setItem(getStorageKey(spaceId), JSON.stringify(map));
}

export function getTaskBucket(spaceId: string, taskId: string) {
  const map = getBucketMap(spaceId);
  return map[taskId];
}

export function filterTasksByBucket<T extends { id: string }>(
  spaceId: string,
  tasks: T[],
  bucket: TaskBucket
) {
  const map = getBucketMap(spaceId);
  return tasks.filter((task) => map[task.id] === bucket);
}
