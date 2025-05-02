import { useAtom } from "jotai";
import { currentUserAtom } from "@/features/user/atoms/current-user-atom";
import React, { useEffect } from "react";
import useCurrentUser from "@/features/user/hooks/use-current-user";
import { useTranslation } from "react-i18next";
import { socketAtom } from "@/features/websocket/atoms/socket-atom.ts";
import { io } from "socket.io-client";
import { SOCKET_URL } from "@/features/websocket/types";
import { useQuerySubscription } from "@/features/websocket/use-query-subscription.ts";
import { useTreeSocket } from "@/features/websocket/use-tree-socket.ts";
import { useCollabToken } from "@/features/auth/queries/auth-query.tsx";
import { Error404 } from "@/components/ui/error-404.tsx";
import { MCPSocketProvider } from "@/features/websocket/providers/mcp-socket-provider.tsx";
import { useMantineColorScheme } from "@mantine/core";
import { DocmostThemeProvider } from "./providers/theme-provider";
import { getThemeById } from "@/theme";

export function UserProvider({ children }: React.PropsWithChildren) {
  const [, setCurrentUser] = useAtom(currentUserAtom);
  const { data, isLoading, error, isError } = useCurrentUser();
  const { i18n } = useTranslation();
  const [, setSocket] = useAtom(socketAtom);
  const { setColorScheme } = useMantineColorScheme();
  // fetch collab token on load
  const { data: collab } = useCollabToken();

  useEffect(() => {
    if (isLoading || isError) {
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    // @ts-ignore
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("ws connected");
    });

    return () => {
      console.log("ws disconnected");
      newSocket.disconnect();
    };
  }, [isError, isLoading]);

  useQuerySubscription();
  useTreeSocket();

  // Set user data and initialize theme
  useEffect(() => {
    if (data && data.user && data.workspace) {
      setCurrentUser(data);

      // Set language
      i18n.changeLanguage(
        data.user.locale === "en" ? "en-US" : data.user.locale
      );

      // Set theme if user has a preference
      if (data.user.settings?.preferences?.themeId) {
        const userTheme = getThemeById(data.user.settings.preferences.themeId);
        // Set Mantine color scheme based on theme
        setColorScheme(userTheme.isDark ? "dark" : "light");
      }
    }
  }, [data, isLoading]);

  if (isLoading) return <></>;

  if (isError && error?.["response"]?.status === 404) {
    return <Error404 />;
  }

  if (error) {
    return <></>;
  }

  // Wrap the children with the DocmostThemeProvider and MCPSocketProvider
  return (
    <DocmostThemeProvider>
      <MCPSocketProvider>{children}</MCPSocketProvider>
    </DocmostThemeProvider>
  );
}
