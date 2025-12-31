import { useAtom } from "jotai";
import { currentUserAtom } from "@/features/user/atoms/current-user-atom";
import React, { useEffect } from "react";
import { Center, Loader } from "@mantine/core";
import { useNavigate } from "react-router-dom";
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
import { RavenDocsThemeProvider } from "./providers/theme-provider";

export function UserProvider({ children }: React.PropsWithChildren) {
  const [, setCurrentUser] = useAtom(currentUserAtom);
  const { data, isLoading, error, isError } = useCurrentUser();
  const { i18n } = useTranslation();
  const [, setSocket] = useAtom(socketAtom);
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!isError) {
      return;
    }

    const status = error?.["response"]?.status;
    if (status === 401) {
      setCurrentUser(null);
      navigate("/login");
    }
  }, [error, isError, navigate, setCurrentUser]);

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

      // Theme is managed by RavenDocsThemeProvider
    }
  }, [data, isLoading]);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="md" />
      </Center>
    );
  }

  if (isError && error?.["response"]?.status === 404) {
    return <Error404 />;
  }

  if (error) {
    return (
      <Center h="100vh">
        <Loader size="md" />
      </Center>
    );
  }

  // Wrap the children with the RavenDocsThemeProvider and MCPSocketProvider
  return (
    <RavenDocsThemeProvider>
      <MCPSocketProvider>{children}</MCPSocketProvider>
    </RavenDocsThemeProvider>
  );
}
