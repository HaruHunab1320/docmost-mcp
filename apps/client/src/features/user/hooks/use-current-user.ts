import { useQuery } from "@tanstack/react-query";
import { getMyInfo } from "@/features/user/services/user-service";
import { useAtom } from "jotai";
import {
  userAtom,
  currentUserAtom,
} from "@/features/user/atoms/current-user-atom";
import { useEffect, useRef } from "react";

// Create a variable to track if theme has been manually set during this session
let manualThemeApplied = false;

/**
 * Hook to fetch and manage the current user's data
 */
export default function useCurrentUser() {
  const [, setCurrentUser] = useAtom(currentUserAtom);
  const initialLoadRef = useRef(true);

  const query = useQuery({
    queryKey: ["user-info"],
    queryFn: getMyInfo,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Set the user data in the global store when it's loaded
  useEffect(() => {
    if (query.data) {
      setCurrentUser(query.data);

      // Apply theme if user has a preference AND no manual theme has been set
      if (
        query.data.user?.settings?.preferences?.themeId &&
        !manualThemeApplied &&
        initialLoadRef.current
      ) {
        initialLoadRef.current = false;
      }
    }
  }, [query.data, setCurrentUser]);

  return query;
}

// Export function to mark when a theme has been manually applied
export function setManualThemeApplied(value = true) {
  manualThemeApplied = value;
}

export function isManualThemeApplied() {
  return manualThemeApplied;
}

export function clearManualThemeApplied() {
  manualThemeApplied = false;
}
