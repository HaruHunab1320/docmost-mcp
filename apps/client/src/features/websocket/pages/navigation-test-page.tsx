import React, { useState } from "react";
import {
  Button,
  Card,
  Container,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";
import { mcpSocketAtom } from "../atoms/mcp-socket-atom";
import { useAtom } from "jotai";
import {
  MCPEvent,
  MCPEventType,
  MCPOperationType,
  MCPResourceType,
} from "../types/mcp-event.types";
import { Helmet } from "react-helmet-async";
import { getAppName } from "@/lib/config";

export default function NavigationTestPage() {
  const [destination, setDestination] = useState<
    "home" | "dashboard" | "space" | "page"
  >("home");
  const [spaceId, setSpaceId] = useState<string>("");
  const [pageId, setPageId] = useState<string>("");
  const [socket] = useAtom(mcpSocketAtom);

  // Get spaces for the dropdown
  const { data: spaces } = useGetSpacesQuery();

  // Get space options for the dropdown
  const spaceOptions =
    spaces?.items?.map((space) => ({
      value: space.id,
      label: space.name,
    })) || [];

  const handleNavigate = () => {
    if (!socket) {
      notifications.show({
        title: "Error",
        message: "Socket not connected",
        color: "red",
      });
      return;
    }

    // Create a navigation event
    const navigationEvent: MCPEvent = {
      type: MCPEventType.NAVIGATION,
      resource: MCPResourceType.UI,
      operation: MCPOperationType.NAVIGATE,
      resourceId: "navigation",
      timestamp: new Date().toISOString(),
      data: {
        destination,
        spaceId: destination === "space" ? spaceId : undefined,
        pageId: destination === "page" ? pageId : undefined,
      },
      userId: "current-user", // This will be replaced by the server
      workspaceId: "current-workspace", // This will be replaced by the server
    };

    // Emit the event
    socket.emit("mcp:event", navigationEvent);

    notifications.show({
      title: "Navigation",
      message: `Navigating to ${destination}`,
      color: "blue",
    });
  };

  return (
    <>
      <Helmet>
        <title>Navigation Test - {getAppName()}</title>
      </Helmet>

      <Container size="sm" py="xl">
        <Title order={2} mb="lg">
          MCP Navigation Test
        </Title>

        <Card withBorder shadow="sm" p="lg" radius="md" mb="xl">
          <Stack>
            <Text size="sm">
              This page allows you to test the MCP navigation capabilities.
              Select a destination and click "Navigate" to emit a navigation
              event.
            </Text>

            <Select
              label="Destination"
              placeholder="Select destination"
              value={destination}
              onChange={(value) => setDestination(value as any)}
              data={[
                { value: "home", label: "Home" },
                { value: "dashboard", label: "Dashboard" },
                { value: "space", label: "Space" },
                { value: "page", label: "Page" },
              ]}
              required
            />

            {destination === "space" && (
              <Select
                label="Space"
                placeholder="Select space"
                value={spaceId}
                onChange={setSpaceId}
                data={spaceOptions}
                required
              />
            )}

            {destination === "page" && (
              <>
                <Select
                  label="Space"
                  placeholder="Select space"
                  value={spaceId}
                  onChange={setSpaceId}
                  data={spaceOptions}
                  required
                />

                <TextInput
                  label="Page ID"
                  placeholder="Enter page ID"
                  value={pageId}
                  onChange={(e) => setPageId(e.currentTarget.value)}
                  required
                />
              </>
            )}

            <Group justify="flex-end" mt="md">
              <Button onClick={handleNavigate} color="blue">
                Navigate
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card withBorder shadow="sm" p="lg" radius="md">
          <Title order={4} mb="md">
            Using the MCP Navigation Tool
          </Title>
          <Text size="sm">
            The navigation tool can be used by an agent to control the Raven
            Docs UI. When a navigation event is emitted:
          </Text>
          <ul>
            <li>The client receives the event</li>
            <li>The navigation handler processes the event</li>
            <li>The React Router navigates to the requested destination</li>
          </ul>
          <Text size="sm" mt="md">
            This allows agents to show users exactly what they're working on in
            real-time.
          </Text>
        </Card>
      </Container>
    </>
  );
}
