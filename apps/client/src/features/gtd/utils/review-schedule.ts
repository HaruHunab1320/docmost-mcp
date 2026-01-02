const REVIEW_STORAGE_PREFIX = "ravendocs.review";
const REVIEW_COMPLETED_PREFIX = "ravendocs.review.completed";

export type ReviewChecklist = Record<string, boolean>;

export function getWeekKey(date = new Date()) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const dayOffset = firstDay.getDay() || 7;
  const weekStart = new Date(firstDay);
  weekStart.setDate(firstDay.getDate() + (7 - dayOffset));
  const diff =
    date.getTime() -
    new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
      .getTime();
  const weekNumber = Math.ceil((diff / (1000 * 60 * 60 * 24) + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export function getWeekLabel(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  start.setDate(start.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
}

export function getReviewDueDate(date = new Date(), targetDay = 5) {
  const start = new Date(date);
  const day = start.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  start.setDate(start.getDate() + diffToMonday);
  const due = new Date(start);
  due.setDate(start.getDate() + (targetDay - 1));
  return due;
}

export function isReviewDue(date = new Date(), targetDay = 5) {
  const due = getReviewDueDate(date, targetDay);
  return date >= due;
}

export function getWeeklyReviewStorageKey(spaceId: string, date = new Date()) {
  return `${REVIEW_STORAGE_PREFIX}.${spaceId}.${getWeekKey(date)}`;
}

export function getWeeklyReviewCompletionKey(
  spaceId: string,
  date = new Date()
) {
  return `${REVIEW_COMPLETED_PREFIX}.${spaceId}.${getWeekKey(date)}`;
}

export function readWeeklyChecks(spaceId: string, date = new Date()) {
  const key = getWeeklyReviewStorageKey(spaceId, date);
  const stored = localStorage.getItem(key);
  return stored ? (JSON.parse(stored) as ReviewChecklist) : null;
}

export function isWeeklyReviewCompleted(spaceId: string, date = new Date()) {
  const key = getWeeklyReviewCompletionKey(spaceId, date);
  return Boolean(localStorage.getItem(key));
}
