import { atomWithStorage } from "jotai/utils";

export type PageTab = {
  id: string;
  title: string;
  url: string;
  icon?: string | null;
};

export const pageTabsAtom = atomWithStorage<PageTab[]>("pageTabs", []);
