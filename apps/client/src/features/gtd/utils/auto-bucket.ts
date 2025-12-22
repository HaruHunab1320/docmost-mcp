import { TaskBucket } from "@/features/gtd/utils/task-buckets";

export function parseBucketedInput(input: string): {
  title: string;
  bucket?: TaskBucket;
} {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  const match = lower.match(/^(waiting|someday|maybe)\s*[:\-]/);
  if (match) {
    const bucket = match[1] === "waiting" ? "waiting" : "someday";
    const title = trimmed.replace(/^(waiting|someday|maybe)\s*[:\-]\s*/i, "");
    return { title: title || trimmed, bucket };
  }

  if (lower.startsWith("waiting for ")) {
    return { title: trimmed.replace(/^waiting for\s+/i, ""), bucket: "waiting" };
  }

  if (lower.includes("waiting on") || lower.includes("waiting for")) {
    return { title: trimmed, bucket: "waiting" };
  }

  if (lower.includes("someday") || lower.includes("maybe")) {
    return { title: trimmed, bucket: "someday" };
  }

  return { title: trimmed };
}
