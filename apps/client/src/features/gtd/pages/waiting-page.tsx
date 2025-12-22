import { BucketPage } from "@/features/gtd/pages/bucket-page";

export function WaitingPage() {
  return (
    <BucketPage
      bucket="waiting"
      title="Waiting"
      emptyMessage="No waiting items"
    />
  );
}
