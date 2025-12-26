export type TaskBucket = "none" | "inbox" | "waiting" | "someday";

export function getTaskBucket(task: { bucket?: TaskBucket | null }) {
  return task.bucket || "none";
}

export function filterTasksByBucket<T extends { bucket?: TaskBucket | null }>(
  tasks: T[],
  bucket: TaskBucket
) {
  return tasks.filter((task) => getTaskBucket(task) === bucket);
}
