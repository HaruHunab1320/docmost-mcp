import { useCallback } from "react";
import { useAtom } from "jotai";
import { pageTabsAtom, PageTab } from "@/features/page/atoms/page-tabs-atom";

const MAX_TABS = 10;

export function usePageTabs() {
  const [tabs, setTabs] = useAtom(pageTabsAtom);

  const upsertTab = useCallback(
    (nextTab: PageTab) => {
      setTabs((prev) => {
        const existingIndex = prev.findIndex((tab) => tab.id === nextTab.id);
        let updated = [...prev];

        if (existingIndex >= 0) {
          updated[existingIndex] = { ...updated[existingIndex], ...nextTab };
          return updated;
        }

        updated = [...prev, nextTab];
        if (updated.length > MAX_TABS) {
          updated = updated.slice(updated.length - MAX_TABS);
        }
        return updated;
      });
    },
    [setTabs]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => prev.filter((tab) => tab.id !== tabId));
    },
    [setTabs]
  );

  const clearTabs = useCallback(() => {
    setTabs([]);
  }, [setTabs]);

  return { tabs, upsertTab, closeTab, clearTabs };
}
