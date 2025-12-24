import React, { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useAtom } from "jotai";
import { mcpSocketAtom } from "../atoms/mcp-socket-atom";
import { MCPEvent, MCPResourceType, MCPEventType, MCPOperationType } from "../types/mcp-event.types";
import { useMCPEventSubscription } from "../hooks/use-mcp-socket";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getAppName } from "@/lib/config";
import { notifications } from "@mantine/notifications";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";

/**
 * A page for testing MCP WebSocket events and real-time updates
 */
export default function MCPTestPage() {
  const [socket] = useAtom(mcpSocketAtom);
  const [connected, setConnected] = useState<boolean>(false);
  const [events, setEvents] = useState<MCPEvent[]>([]);
  const [resourceType, setResourceType] = useState<MCPResourceType>(
    MCPResourceType.PAGE
  );
  const [resourceId, setResourceId] = useState<string>("");
  const { isSubscribed, subscribe, unsubscribe } = useMCPEventSubscription(
    resourceType,
    resourceId
  );
  const [destination, setDestination] = useState<
    "home" | "dashboard" | "space" | "page"
  >("home");
  const [spaceId, setSpaceId] = useState<string>("");
  const [pageId, setPageId] = useState<string>("");
  const navigate = useNavigate();

  // Get spaces for the dropdown
  const { data: spaces } = useGetSpacesQuery();

  // Get space options for the dropdown
  const spaceOptions =
    spaces?.items?.map((space) => ({
      value: space.id,
      label: space.name,
    })) || [];

  // Track connection status
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleEvent = (event: MCPEvent) => {
      setEvents((prev) => [event, ...prev.slice(0, 19)]); // Keep last 20 events
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("mcp:event", handleEvent);

    setConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("mcp:event", handleEvent);
    };
  }, [socket]);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

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
        <title>MCP Test Dashboard - {getAppName()}</title>
      </Helmet>
      <Container size="lg" py="xl">
        <Title order={2} mb="lg">
          MCP Real-time Events Dashboard
        </Title>

        <Group align="flex-start" grow>
          {/* Left column: Connection status and subscription */}
          <Paper p="md" withBorder>
            <Stack>
              <Group justify="space-between">
                <Text fw={500}>Connection Status</Text>
                <Badge color={connected ? "green" : "red"}>
                  {connected ? "Connected" : "Disconnected"}
                </Badge>
              </Group>

              <Divider />

              <Text fw={500}>Resource Subscription</Text>

              <Select
                label="Resource Type"
                value={resourceType}
                onChange={(value) => setResourceType(value as MCPResourceType)}
                data={Object.values(MCPResourceType).map((type) => ({
                  value: type,
                  label: type.charAt(0).toUpperCase() + type.slice(1),
                }))}
              />

              <TextInput
                label="Resource ID"
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                placeholder="Enter resource ID to subscribe"
              />

              <Group>
                <Button
                  onClick={() => subscribe()}
                  disabled={!resourceId || isSubscribed}
                  color="blue"
                >
                  Subscribe
                </Button>
                <Button
                  onClick={() => unsubscribe()}
                  disabled={!isSubscribed}
                  color="red"
                  variant="outline"
                >
                  Unsubscribe
                </Button>
              </Group>

              {isSubscribed && (
                <Badge color="green">
                  Subscribed to {resourceType} events for ID: {resourceId}
                </Badge>
              )}

            </Stack>
          </Paper>

          {/* Right column: Event log */}
          <Card withBorder>
            <Card.Section withBorder p="md">
              <Group justify="space-between">
                <Text fw={500}>Event Log</Text>
                <Badge>{events.length} events</Badge>
              </Group>
            </Card.Section>

            <ScrollArea h={500} p="md">
              {events.length === 0 ? (
                <Text c="dimmed" ta="center" my="xl">
                  No events received yet. Subscribe to a resource to see events.
                </Text>
              ) : (
                <Stack gap="xs">
                  {events.map((event, index) => (
                    <Paper key={index} p="sm" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Badge color={getEventColor(event.type)}>
                          {event.type.toUpperCase()}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {formatTime(event.timestamp)}
                        </Text>
                      </Group>

                      <Group justify="space-between" mb="xs">
                        <Text size="sm" fw={500}>
                          {event.resource.toUpperCase()}
                        </Text>
                        <Badge variant="outline" size="sm">
                          {event.operation}
                        </Badge>
                      </Group>

                      <Text size="sm">ID: {event.resourceId}</Text>
                      {event.spaceId && (
                        <Text size="sm">Space: {event.spaceId}</Text>
                      )}

                      {event.data && (
                        <Paper mt="xs" p="xs" bg="gray.0">
                          <Text size="xs" fw={500} mb="xs">
                            Event Data:
                          </Text>
                          <ScrollArea h={60}>
                            <Text size="xs" ff="monospace">
                              {JSON.stringify(event.data, null, 2)}
                            </Text>
                          </ScrollArea>
                        </Paper>
                      )}
                    </Paper>
                  ))}
                </Stack>
              )}
            </ScrollArea>
          </Card>
        </Group>

        <Card withBorder shadow="sm" p="lg" radius="md" mt="xl">
          <Title order={4} mb="md">
            MCP Navigation Test
          </Title>
          <Text size="sm">
            This page allows you to test the MCP navigation capabilities. Select
            a destination and click "Navigate" to emit a navigation event.
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
        </Card>

        <Card withBorder shadow="sm" p="lg" radius="md" mt="xl">
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

// Helper to get color based on event type
function getEventColor(eventType: string): string {
  switch (eventType) {
    case "created":
      return "green";
    case "updated":
      return "blue";
    case "deleted":
      return "red";
    case "moved":
      return "orange";
    case "permission_changed":
      return "purple";
    case "presence":
      return "cyan";
    default:
      return "gray";
  }
}
