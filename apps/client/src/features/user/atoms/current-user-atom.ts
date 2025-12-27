import { atomWithStorage } from "jotai/utils";

import { ICurrentUser } from "@/features/user/types/user.types";
import { atom } from "jotai";

export const currentUserAtom = atomWithStorage<ICurrentUser | null>(
  "currentUser",
  null,
);

export const userAtom = atom((get) => get(currentUserAtom)?.user ?? null);
export const workspaceAtom = atom(
  (get) => get(currentUserAtom)?.workspace ?? null,
);
