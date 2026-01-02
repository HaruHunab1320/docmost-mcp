import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Drawer,
  Group,
  Loader,
  Modal,
  MultiSelect,
  ActionIcon,
  Menu,
  Select,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  Title,
  TypographyStylesProvider,
  useMantineTheme,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { agentMemoryService } from "@/features/agent-memory/services/agent-memory-service";
import { useAtom } from "jotai";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom";
import { createGoal, listGoals } from "@/features/goal/services/goal-service";
import { runAgentLoop } from "@/features/agent/services/agent-service";
import { useNavigate } from "react-router-dom";
import { projectService } from "@/features/project/services/project-service";
import { useProjects } from "@/features/project/hooks/use-projects";
import { getProjectsArray } from "@/features/project/utils/project-data";
import { notifications } from "@mantine/notifications";
import { IconChevronDown, IconChevronRight, IconDotsVertical } from "@tabler/icons-react";
import { markdownToHtml } from "@raven-docs/editor-ext";
import classes from "./memory-insights-page.module.css";

function renderMemoryContent(content: unknown) {
  if (!content || typeof content !== "object") return null;
  const record = content as Record<string, any>;
  if (typeof record.rawResponse === "string" && record.rawResponse.trim()) {
    return record.rawResponse;
  }
  if (record.plan?.summary) {
    return record.plan.summary as string;
  }
  if (Array.isArray(record.actions) && record.actions.length) {
    return `Actions: ${record.actions.map((action: any) => action.method).join(", ")}`;
  }
  return null;
}

function getContentText(content: unknown) {
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const record = content as Record<string, any>;
    if (typeof record.text === "string") return record.text;
  }
  return renderMemoryContent(content) || "";
}

function parseCsv(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function groupByDay(items: Array<{ timestamp?: string }>) {
  return items.reduce<Record<string, typeof items>>((acc, item) => {
    const date = item.timestamp ? new Date(item.timestamp) : new Date();
    const key = date.toLocaleDateString();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

function extractPageId(content: unknown): string | null {
  if (!content || typeof content !== "object") return null;
  const record = content as Record<string, any>;
  if (typeof record.pageId === "string") return record.pageId;
  if (record.page && typeof record.page.id === "string") return record.page.id;
  if (record.page && typeof record.page.pageId === "string") return record.page.pageId;
  return null;
}

function formatLastSeen(lastSeen?: string | null) {
  if (!lastSeen) return "Unknown";
  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString();
}

export function MemoryInsightsPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [workspace] = useAtom(workspaceAtom);
  const queryClient = useQueryClient();
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tagFilter, setTagFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nodeQuery, setNodeQuery] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [layout, setLayout] = useState<"radial" | "grid" | "cluster">("radial");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [goalName, setGoalName] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalHorizon, setGoalHorizon] = useState("short");
  const [goalKeywords, setGoalKeywords] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [taskProjectId, setTaskProjectId] = useState<string | null>(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionEntityIds, setCollectionEntityIds] = useState<string[]>([]);
  const [collectionMode, setCollectionMode] = useState<"create" | "edit">("create");
  const [collectionOriginalName, setCollectionOriginalName] = useState<string | null>(null);
  const [signalsCollapsed, setSignalsCollapsed] = useState(true);
  const [autonomyCollapsed, setAutonomyCollapsed] = useState(true);
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);
  const [collectionsCollapsed, setCollectionsCollapsed] = useState(true);

  const filterTags = useMemo(() => parseCsv(tagFilter), [tagFilter]);
  const filterSources = useMemo(() => parseCsv(sourceFilter), [sourceFilter]);

  const memoryParams = useMemo(
    () => ({
      workspaceId: workspace?.id || "",
      spaceId: spaceId || "",
      tags: filterTags.length ? filterTags : undefined,
      sources: filterSources.length ? filterSources : undefined,
      from: fromFilter || undefined,
      to: toFilter || undefined,
      limit: 120,
    }),
    [workspace?.id, spaceId, filterTags, filterSources, fromFilter, toFilter],
  );

  const memoriesQuery = useQuery({
    queryKey: ["memory-insights", memoryParams],
    queryFn: () => agentMemoryService.query(memoryParams),
    enabled: !!workspace?.id && !!spaceId,
  });

  const signalsQuery = useQuery({
    queryKey: ["memory-signals", workspace?.id, spaceId],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || "",
        tags: ["agent-insight"],
        limit: 30,
      }),
    enabled: !!workspace?.id && !!spaceId,
  });

  const goalsQuery = useQuery({
    queryKey: ["goal-insights", workspace?.id, spaceId],
    queryFn: () =>
      listGoals({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || undefined,
      }),
    enabled: !!workspace?.id && !!spaceId,
  });

  const projectsQuery = useProjects({ spaceId: spaceId || "" });
  const projectOptions = useMemo(() => {
    const projects = getProjectsArray(projectsQuery.data);
    return projects.map((project) => ({
      value: project.id,
      label: project.name || "Untitled project",
    }));
  }, [projectsQuery.data]);

  const loopMutation = useMutation({
    mutationFn: () =>
      runAgentLoop({
        spaceId: spaceId || "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-insights"] });
      queryClient.invalidateQueries({ queryKey: ["memory-signals"] });
      queryClient.invalidateQueries({ queryKey: ["agent-approvals"] });
    },
  });

  const grouped = useMemo(() => {
    const items = memoriesQuery.data || [];
    return groupByDay(items);
  }, [memoriesQuery.data]);

  useEffect(() => {
    const entityId = searchParams.get("entityId");
    if (entityId) {
      setSelectedEntityId(entityId);
    }
  }, [searchParams]);

  const groupedEntries = Object.entries(grouped);

  const graphQuery = useQuery({
    queryKey: ["memory-graph", workspace?.id, spaceId, filterTags, filterSources, fromFilter, toFilter],
    queryFn: () =>
      agentMemoryService.graph({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || "",
        tags: filterTags.length ? filterTags : undefined,
        sources: filterSources.length ? filterSources : undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
        maxNodes: 18,
        maxEdges: 40,
      }),
    enabled: !!workspace?.id && !!spaceId,
  });

  const graphNodes = graphQuery.data?.nodes || [];
  const graphEdges = graphQuery.data?.edges || [];
  const entityOptions = useMemo(
    () =>
      graphNodes.map((node) => ({
        value: node.id,
        label: node.label,
      })),
    [graphNodes],
  );
  const graphTypes = useMemo(
    () =>
      Array.from(new Set(graphNodes.map((node) => node.type))).filter(Boolean),
    [graphNodes],
  );
  const typePalette = [
    "blue",
    "teal",
    "grape",
    "orange",
    "cyan",
    "lime",
    "pink",
    "violet",
  ] as const;
  const typeColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    graphTypes.forEach((type, index) => {
      map[type] = typePalette[index % typePalette.length];
    });
    return map;
  }, [graphTypes]);
  const activeTypeSet = useMemo(
    () => new Set(activeTypes.length ? activeTypes : graphTypes),
    [activeTypes, graphTypes],
  );
  const graphSize = 320;
  const graphCenter = graphSize / 2;
  const graphRadius = 110;
  const filteredGraphNodes = useMemo(
    () => graphNodes.filter((node) => activeTypeSet.has(node.type)),
    [graphNodes, activeTypeSet],
  );

  const filteredGraphEdges = useMemo(
    () =>
      graphEdges.filter(
        (edge) =>
          activeTypeSet.has(graphNodes.find((node) => node.id === edge.source)?.type || "") &&
          activeTypeSet.has(graphNodes.find((node) => node.id === edge.target)?.type || ""),
      ),
    [graphEdges, graphNodes, activeTypeSet],
  );

  const nodePositions = useMemo(() => {
    const total = filteredGraphNodes.length || 1;
    if (layout === "grid") {
      const columns = Math.ceil(Math.sqrt(total));
      const cellSize = graphSize / Math.max(columns, 1);
      return filteredGraphNodes.reduce<Record<string, { x: number; y: number }>>(
        (acc, node, index) => {
          const row = Math.floor(index / columns);
          const col = index % columns;
          acc[node.id] = {
            x: cellSize * col + cellSize / 2,
            y: cellSize * row + cellSize / 2,
          };
          return acc;
        },
        {},
      );
    }

    if (layout === "cluster") {
      const types = Array.from(
        new Set(filteredGraphNodes.map((node) => node.type)),
      );
      const clusterRadius = graphRadius * 0.8;
      const clusterCenters = types.reduce<Record<string, { x: number; y: number }>>(
        (acc, type, index) => {
          const angle = (Math.PI * 2 * index) / Math.max(types.length, 1);
          acc[type] = {
            x: graphCenter + clusterRadius * Math.cos(angle),
            y: graphCenter + clusterRadius * Math.sin(angle),
          };
          return acc;
        },
        {},
      );

      const grouped = filteredGraphNodes.reduce<Record<string, typeof filteredGraphNodes>>(
        (acc, node) => {
          acc[node.type] = acc[node.type] || [];
          acc[node.type].push(node);
          return acc;
        },
        {},
      );

      return Object.entries(grouped).reduce<Record<string, { x: number; y: number }>>(
        (acc, [type, nodes]) => {
          const center = clusterCenters[type] || {
            x: graphCenter,
            y: graphCenter,
          };
          nodes.forEach((node, index) => {
            const angle = (Math.PI * 2 * index) / Math.max(nodes.length, 1);
            acc[node.id] = {
              x: center.x + 28 * Math.cos(angle),
              y: center.y + 28 * Math.sin(angle),
            };
          });
          return acc;
        },
        {},
      );
    }

    return filteredGraphNodes.reduce<Record<string, { x: number; y: number }>>(
      (acc, node, index) => {
        const angle = (Math.PI * 2 * index) / total;
        acc[node.id] = {
          x: graphCenter + graphRadius * Math.cos(angle),
          y: graphCenter + graphRadius * Math.sin(angle),
        };
        return acc;
      },
      {},
    );
  }, [filteredGraphNodes, graphCenter, graphRadius, graphSize, layout]);

  const relatedEntities = useMemo(() => {
    if (!selectedEntityId) return [];
    const weights = new Map<string, number>();
    graphEdges.forEach((edge) => {
      if (edge.source === selectedEntityId) {
        weights.set(edge.target, Math.max(weights.get(edge.target) || 0, edge.weight));
      } else if (edge.target === selectedEntityId) {
        weights.set(edge.source, Math.max(weights.get(edge.source) || 0, edge.weight));
      }
    });

    return Array.from(weights.entries())
      .map(([id, weight]) => ({
        id,
        weight,
        label: graphNodes.find((node) => node.id === id)?.label || "Entity",
        type: graphNodes.find((node) => node.id === id)?.type || "entity",
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6);
  }, [selectedEntityId, graphEdges, graphNodes]);

  const selectedEntityDetails = useQuery({
    queryKey: ["memory-entity-details", workspace?.id, spaceId, selectedEntityId],
    queryFn: () =>
      agentMemoryService.entityDetails({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || "",
        entityId: selectedEntityId || "",
        limit: 12,
      }),
    enabled: !!workspace?.id && !!spaceId && !!selectedEntityId,
  });

  const hoveredEntityQuery = useQuery({
    queryKey: ["memory-entity-preview", workspace?.id, spaceId, hoveredEntityId],
    queryFn: () =>
      agentMemoryService.entity({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || "",
        entityId: hoveredEntityId || "",
        limit: 1,
      }),
    enabled: !!workspace?.id && !!spaceId && !!hoveredEntityId,
  });

  const pinnedEntityQuery = useQuery({
    queryKey: ["memory-entity-pins", workspace?.id, spaceId],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || "",
        tags: ["entity-pin"],
        limit: 50,
      }),
    enabled: !!workspace?.id && !!spaceId,
  });

  const pinnedEntities = useMemo(() => {
    const records = pinnedEntityQuery.data || [];
    const latest = new Map<
      string,
      { action: string; timestamp?: string | Date }
    >();
    records.forEach((record) => {
      const content = record.content as Record<string, any> | undefined;
      if (!content?.entityId) return;
      const timestamp = record.timestamp;
      const existing = latest.get(content.entityId);
      const incomingTime = timestamp ? new Date(timestamp).getTime() : 0;
      const existingTime = existing?.timestamp
        ? new Date(existing.timestamp).getTime()
        : 0;
      if (!existing || incomingTime >= existingTime) {
        latest.set(content.entityId, {
          action: content.action,
          timestamp,
        });
      }
    });

    return Array.from(latest.entries())
      .filter(([, value]) => value.action === "pin")
      .map(([id]) => id);
  }, [pinnedEntityQuery.data]);

  const collectionsQuery = useQuery({
    queryKey: ["entity-collections", workspace?.id, spaceId],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || "",
        tags: ["entity-collection"],
        limit: 50,
      }),
    enabled: !!workspace?.id && !!spaceId,
  });

  const collections = useMemo(() => {
    const entries = collectionsQuery.data || [];
    const latest = new Map<
      string,
      { entityIds: string[]; timestamp?: string | Date; action: string }
    >();
    entries.forEach((entry) => {
      const content = entry.content as Record<string, any> | undefined;
      if (!content?.name || !Array.isArray(content.entityIds)) return;
      const existing = latest.get(content.name);
      const incomingTime = entry.timestamp ? new Date(entry.timestamp).getTime() : 0;
      const existingTime = existing?.timestamp
        ? new Date(existing.timestamp).getTime()
        : 0;
      if (!existing || incomingTime >= existingTime) {
        latest.set(content.name, {
          entityIds: content.entityIds,
          timestamp: entry.timestamp,
          action: content.action || "create",
        });
      }
    });

    return Array.from(latest.entries())
      .filter(([, value]) => value.action !== "delete")
      .map(([name, value]) => ({
        name,
        entityIds: value.entityIds,
        updatedAt: value.timestamp,
      }));
  }, [collectionsQuery.data]);

  const filteredNodes = useMemo(() => {
    if (!nodeQuery.trim()) return graphNodes;
    const search = nodeQuery.toLowerCase();
    return graphNodes.filter(
      (node) =>
        node.label.toLowerCase().includes(search) &&
        activeTypeSet.has(node.type),
    );
  }, [graphNodes, nodeQuery, activeTypeSet]);

  const sortedNodes = useMemo(() => {
    const pinnedSet = new Set(pinnedEntities);
    return [...filteredNodes].sort((a, b) => {
      const aPinned = pinnedSet.has(a.id);
      const bPinned = pinnedSet.has(b.id);
      if (aPinned === bPinned) return b.count - a.count;
      return aPinned ? -1 : 1;
    });
  }, [filteredNodes, pinnedEntities]);

  const autonomyHistoryQuery = useQuery({
    queryKey: ["autonomy-history", workspace?.id, spaceId, fromFilter, toFilter],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || "",
        sources: ["agent-loop"],
        from: fromFilter || undefined,
        to: toFilter || undefined,
        limit: 8,
      }),
    enabled: !!workspace?.id && !!spaceId,
  });

  const autonomyStatsQuery = useQuery({
    queryKey: ["autonomy-stats", workspace?.id, spaceId, fromFilter, toFilter],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || "",
        sources: ["agent-loop"],
        from: fromFilter || undefined,
        to: toFilter || undefined,
        limit: 60,
      }),
    enabled: !!workspace?.id && !!spaceId,
  });

  const approvalEventsQuery = useQuery({
    queryKey: ["approval-events", workspace?.id, spaceId, fromFilter, toFilter],
    queryFn: () =>
      agentMemoryService.query({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || "",
        tags: ["approval-created", "approval-applied"],
        from: fromFilter || undefined,
        to: toFilter || undefined,
        limit: 100,
      }),
    enabled: !!workspace?.id && !!spaceId,
  });

  const autonomyStats = useMemo(() => {
    const entries = autonomyStatsQuery.data || [];
    const daily: Record<string, number> = {};
    let totalActions = 0;
    let approvals = 0;
    let applied = 0;
    let failed = 0;
    let denied = 0;
    let skipped = 0;
    let retries = 0;

    entries.forEach((entry) => {
      const dateKey = entry.timestamp
        ? new Date(entry.timestamp).toLocaleDateString()
        : "Unknown";
      daily[dateKey] = (daily[dateKey] || 0) + 1;

      const content = entry.content as Record<string, any> | undefined;
      const actions = Array.isArray(content?.actions) ? content?.actions : [];
      totalActions += actions.length;
      approvals += actions.filter((action: any) =>
        String(action.status || "").startsWith("approval:"),
      ).length;
      applied += actions.filter((action: any) => action.status === "applied").length;
      failed += actions.filter((action: any) => action.status === "failed").length;
      denied += actions.filter((action: any) =>
        String(action.status || "").startsWith("denied:"),
      ).length;
      skipped += actions.filter((action: any) =>
        String(action.status || "").startsWith("skipped:"),
      ).length;
      retries += actions.reduce((total: number, action: any) => {
        const attempts = Number(action.attempts || 1);
        return total + Math.max(attempts - 1, 0);
      }, 0);
    });

    const trend = Object.entries(daily)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => (a.day < b.day ? -1 : 1))
      .slice(-14);

    return {
      trend,
      totalActions,
      approvals,
      applied,
      failed,
      denied,
      skipped,
      retries,
    };
  }, [autonomyStatsQuery.data]);

  const approvalLatency = useMemo(() => {
    const events = approvalEventsQuery.data || [];
    const created = new Map<string, number>();
    const applied = new Map<string, number>();
    events.forEach((entry) => {
      const content = entry.content as Record<string, any> | undefined;
      const token = content?.token as string | undefined;
      if (!token || !entry.timestamp) return;
      const time = new Date(entry.timestamp).getTime();
      if ((entry.tags || []).includes("approval-created")) {
        created.set(token, time);
      }
      if ((entry.tags || []).includes("approval-applied")) {
        applied.set(token, time);
      }
    });

    const latencies: number[] = [];
    created.forEach((time, token) => {
      const appliedTime = applied.get(token);
      if (appliedTime && appliedTime > time) {
        latencies.push((appliedTime - time) / 60000);
      }
    });

    if (!latencies.length) return null;
    const total = latencies.reduce((acc, value) => acc + value, 0);
    return total / latencies.length;
  }, [approvalEventsQuery.data]);

  const filteredHistory = useMemo(() => {
    const entries = autonomyHistoryQuery.data || [];
    if (historyFilter === "all") return entries;

    return entries.filter((entry) => {
      const content = entry.content as Record<string, any> | undefined;
      const actions = Array.isArray(content?.actions) ? content?.actions : [];
      const hasApproval = actions.some((action: any) =>
        String(action.status || "").startsWith("approval:"),
      );
      const hasFailure = actions.some((action: any) => action.status === "failed");
      const hasApplied = actions.some((action: any) => action.status === "applied");

      if (historyFilter === "approvals") return hasApproval;
      if (historyFilter === "failed") return hasFailure;
      if (historyFilter === "applied") return hasApplied && !hasFailure;
      return true;
    });
  }, [autonomyHistoryQuery.data, historyFilter]);

  const createTaskMutation = useMutation({
    mutationFn: () =>
      projectService.createTask({
        title: taskTitle.trim() || selectedEntityDetails.data?.entity?.name || "New task",
        description:
          taskDescription.trim() ||
          (selectedEntityDetails.data?.entity?.name
            ? `Linked entity: ${selectedEntityDetails.data.entity.name}`
            : undefined),
        spaceId: spaceId || "",
        bucket: "inbox",
        projectId: taskProjectId || undefined,
      }),
    onSuccess: (task) => {
      notifications.show({
        title: "Task created",
        message: "Task added to inbox",
        color: "green",
      });
      setTaskModalOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskProjectId(null);
      if (selectedEntityDetails.data?.entity?.id) {
        agentMemoryService.ingest({
          workspaceId: workspace?.id || "",
          spaceId: spaceId || undefined,
          source: "entity-link",
          summary: "Linked entity to task",
          content: {
            entityId: selectedEntityDetails.data.entity.id,
            entityName: selectedEntityDetails.data.entity.name,
            taskId: task.id,
            taskTitle: task.title,
          },
          tags: ["entity-link", "entity-task"],
        });
      }
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to create task",
        color: "red",
      });
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: () => {
      const entityName = selectedEntityDetails.data?.entity?.name;
      const keywords = goalKeywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (entityName && !keywords.includes(entityName)) {
        keywords.push(entityName);
      }

      return createGoal({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || undefined,
        name: goalName.trim() || entityName || "New goal",
        horizon: goalHorizon,
        description: goalDescription.trim() || undefined,
        keywords,
      });
    },
    onSuccess: (goal) => {
      notifications.show({
        title: "Goal created",
        message: "Goal added to roadmap",
        color: "green",
      });
      setGoalModalOpen(false);
      setGoalName("");
      setGoalDescription("");
      setGoalKeywords("");
      setGoalHorizon("short");
      queryClient.invalidateQueries({ queryKey: ["goal-insights"] });
      if (selectedEntityDetails.data?.entity?.id) {
        agentMemoryService.ingest({
          workspaceId: workspace?.id || "",
          spaceId: spaceId || undefined,
          source: "entity-link",
          summary: "Linked entity to goal",
          content: {
            entityId: selectedEntityDetails.data.entity.id,
            entityName: selectedEntityDetails.data.entity.name,
            goalId: goal.id,
            goalName: goal.name,
          },
          tags: ["entity-link", "entity-goal"],
        });
      }
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to create goal",
        color: "red",
      });
    },
  });

  const tagMutation = useMutation({
    mutationFn: (tags: string[]) =>
      agentMemoryService.ingest({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || undefined,
        source: "entity-tag",
        summary: `Tagged entity: ${selectedEntityDetails.data?.entity?.name || "Entity"}`,
        content: {
          entityId: selectedEntityId,
          entityName: selectedEntityDetails.data?.entity?.name,
          tags,
        },
        tags: ["agent", "entity-tag", ...tags],
      }),
    onSuccess: () => {
      notifications.show({
        title: "Tags saved",
        message: "Entity tags stored in memory",
        color: "green",
      });
      setTagDraft("");
      queryClient.invalidateQueries({ queryKey: ["memory-insights"] });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to save tags",
        color: "red",
      });
    },
  });

  const pinMutation = useMutation({
    mutationFn: (action: "pin" | "unpin") =>
      agentMemoryService.ingest({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || undefined,
        source: "entity-pin",
        summary: `Entity ${action}`,
        content: {
          entityId: selectedEntityDetails.data?.entity?.id,
          entityName: selectedEntityDetails.data?.entity?.name,
          action,
        },
        tags: ["entity-pin", action],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-entity-pins"] });
    },
  });

  const saveCollectionMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = collectionName.trim();
      const action = collectionMode === "edit" ? "update" : "create";
      await agentMemoryService.ingest({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || undefined,
        source: "entity-collection",
        summary:
          action === "update"
            ? `Entity collection updated: ${trimmedName}`
            : `Entity collection: ${trimmedName}`,
        content: {
          name: trimmedName,
          entityIds: collectionEntityIds,
          action,
          previousName: collectionOriginalName || undefined,
        },
        tags: ["entity-collection"],
      });

      if (
        collectionMode === "edit" &&
        collectionOriginalName &&
        collectionOriginalName !== trimmedName
      ) {
        await agentMemoryService.ingest({
          workspaceId: workspace?.id || "",
          spaceId: spaceId || undefined,
          source: "entity-collection",
          summary: `Entity collection deleted: ${collectionOriginalName}`,
          content: {
            name: collectionOriginalName,
            entityIds: [],
            action: "delete",
          },
          tags: ["entity-collection"],
        });
      }
    },
    onSuccess: () => {
      notifications.show({
        title: collectionMode === "edit" ? "Collection updated" : "Collection saved",
        message:
          collectionMode === "edit"
            ? "Entity collection updated"
            : "Entity collection created",
        color: "green",
      });
      setCollectionModalOpen(false);
      setCollectionName("");
      setCollectionEntityIds([]);
      setCollectionMode("create");
      setCollectionOriginalName(null);
      queryClient.invalidateQueries({ queryKey: ["entity-collections"] });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to save collection",
        color: "red",
      });
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: (collectionNameToDelete: string) =>
      agentMemoryService.ingest({
        workspaceId: workspace?.id || "",
        spaceId: spaceId || undefined,
        source: "entity-collection",
        summary: `Entity collection deleted: ${collectionNameToDelete}`,
        content: {
          name: collectionNameToDelete,
          entityIds: [],
          action: "delete",
        },
        tags: ["entity-collection"],
      }),
    onSuccess: () => {
      notifications.show({
        title: "Collection deleted",
        message: "Entity collection removed",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["entity-collections"] });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to delete collection",
        color: "red",
      });
    },
  });

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="md">
        <Title order={2}>Insights</Title>
        <Button
          variant="light"
          onClick={() => loopMutation.mutate()}
          loading={loopMutation.isPending}
          disabled={!spaceId}
        >
          Run autonomy cycle
        </Button>
      </Group>

      <Stack gap="md">
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Filters</Title>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                setTagFilter("");
                setSourceFilter("");
                setFromFilter("");
                setToFilter("");
              }}
            >
              Clear
            </Button>
          </Group>
          <Group grow>
            <TextInput
              label="Tags"
              placeholder="agent-insight, roadmap"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.currentTarget.value)}
            />
            <TextInput
              label="Sources"
              placeholder="agent-loop, ui"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.currentTarget.value)}
            />
          </Group>
          <Group grow mt="sm">
            <TextInput
              label="From"
              placeholder="YYYY-MM-DD"
              value={fromFilter}
              onChange={(event) => setFromFilter(event.currentTarget.value)}
            />
            <TextInput
              label="To"
              placeholder="YYYY-MM-DD"
              value={toFilter}
              onChange={(event) => setToFilter(event.currentTarget.value)}
            />
          </Group>
          <Text size="xs" c="dimmed" mt="sm">
            Use ISO dates and comma-separated lists to focus the memory timeline and graph.
          </Text>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Signals & summaries</Title>
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Recent insights generated by the agent
              </Text>
              <Button
                size="xs"
                variant="subtle"
                leftSection={
                  signalsCollapsed ? (
                    <IconChevronRight size={14} />
                  ) : (
                    <IconChevronDown size={14} />
                  )
                }
                onClick={() => setSignalsCollapsed((prev) => !prev)}
              >
                {signalsCollapsed ? "Expand" : "Collapse"}
              </Button>
            </Group>
          </Group>
          {signalsCollapsed ? (
            <Text size="sm" c="dimmed">
              {signalsQuery.data?.length
                ? `${signalsQuery.data.length} insight entries hidden.`
                : "No insight memories yet."}
            </Text>
          ) : signalsQuery.isLoading ? (
            <Text size="sm" c="dimmed">
              Loading insights...
            </Text>
          ) : signalsQuery.data?.length ? (
            <Stack gap="xs">
              {signalsQuery.data.map((item) => (
                <Card key={item.id} withBorder radius="sm" p="sm">
                  <Stack gap={4}>
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        {item.summary || "Insight"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {item.timestamp
                          ? new Date(item.timestamp).toLocaleString()
                          : ""}
                      </Text>
                    </Group>
                    {item.tags?.length ? (
                      <Group gap={6}>
                        {item.tags.map((tag) => (
                          <Badge key={tag} size="xs" variant="light">
                            {tag}
                          </Badge>
                        ))}
                      </Group>
                    ) : null}
                    {item.content ? (
                      <TypographyStylesProvider className={classes.markdown}>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: markdownToHtml(
                              typeof item.content === "string"
                                ? item.content
                                : "text" in (item.content as Record<string, any>)
                                  ? (item.content as { text?: string }).text || ""
                                  : ""
                            ),
                          }}
                        />
                      </TypographyStylesProvider>
                    ) : null}
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              No insight memories yet.
            </Text>
          )}
        </Card>

        <Group align="flex-start" grow>
          <Card withBorder radius="md" p="md">
            <Title order={4} mb="sm">
              Goal progress
            </Title>
            {goalsQuery.isLoading ? (
              <Text size="sm" c="dimmed">
                Loading goals...
              </Text>
            ) : goalsQuery.data?.length ? (
              <Stack gap="xs">
                {goalsQuery.data.map((goal) => (
                  <Group key={goal.id} justify="space-between">
                    <Text size="sm">{goal.name}</Text>
                    <Badge size="sm" variant="light">
                      {goal.horizon}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                No goals found.
              </Text>
            )}
          </Card>

          <Card withBorder radius="md" p="md">
            <Title order={4} mb="sm">
              Graph explorer
            </Title>
            {graphQuery.isLoading ? (
              <Text size="sm" c="dimmed">
                Building graph...
              </Text>
            ) : graphNodes.length ? (
              <Stack gap="xs">
                <Box
                  component="svg"
                  w="100%"
                  h={graphSize}
                  viewBox={`0 0 ${graphSize} ${graphSize}`}
                  style={{ borderRadius: 12, border: `1px solid ${theme.colors.gray[8]}` }}
                >
                  {filteredGraphEdges.map((edge) => {
                    const source = nodePositions[edge.source];
                    const target = nodePositions[edge.target];
                    if (!source || !target) return null;
                    const isHighlighted =
                      hoveredEntityId === edge.source ||
                      hoveredEntityId === edge.target ||
                      selectedEntityId === edge.source ||
                      selectedEntityId === edge.target;
                    const stroke = theme.colors.blue[6];
                    const opacity = isHighlighted
                      ? 0.9
                      : Math.min(0.6, 0.2 + edge.weight * 0.08);
                    return (
                      <line
                        key={`${edge.source}-${edge.target}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={stroke}
                        strokeOpacity={opacity}
                        strokeWidth={Math.min(4, 1 + edge.weight * 0.4)}
                      >
                        <title>
                          Weight {edge.weight}
                        </title>
                      </line>
                    );
                  })}
                  {filteredGraphNodes.map((node) => {
                    const position = nodePositions[node.id];
                    if (!position) return null;
                    const radius = Math.min(18, 10 + node.count * 2);
                    const isActive =
                      hoveredEntityId === node.id ||
                      selectedEntityId === node.id;
                    const typeColor = typeColorMap[node.type] || "indigo";
                    const nodeFill = theme.colors[typeColor]
                      ? theme.colors[typeColor][6]
                      : theme.colors.indigo[6];
                    const activeFill = theme.colors[typeColor]
                      ? theme.colors[typeColor][4]
                      : theme.colors.blue[4];
                    const badgeRadius = 7;
                    const badgeX = position.x + radius - 2;
                    const badgeY = position.y - radius + 2;
                    return (
                      <g
                        key={node.id}
                        onMouseEnter={() => setHoveredEntityId(node.id)}
                        onMouseLeave={() => setHoveredEntityId(null)}
                        onClick={() => setSelectedEntityId(node.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <circle
                          cx={position.x}
                          cy={position.y}
                          r={radius}
                          fill={isActive ? activeFill : nodeFill}
                          opacity={isActive ? 1 : 0.85}
                        />
                        <circle
                          cx={badgeX}
                          cy={badgeY}
                          r={badgeRadius}
                          fill={theme.colors.gray[9]}
                        />
                        <text
                          x={badgeX}
                          y={badgeY + 3}
                          textAnchor="middle"
                          fontSize="9"
                          fill={theme.white}
                        >
                          {Math.min(node.count, 99)}
                        </text>
                        <title>
                          {node.label} • {node.type} ({node.count}) • Last seen {formatLastSeen(node.lastSeen)}
                        </title>
                        <text
                          x={position.x}
                          y={position.y + 4}
                          textAnchor="middle"
                          fontSize="10"
                          fill={theme.white}
                        >
                          {node.label.slice(0, 6)}
                        </text>
                      </g>
                    );
                  })}
                </Box>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Layout
                  </Text>
                  <SegmentedControl
                    size="xs"
                    value={layout}
                    onChange={(value) =>
                      setLayout(value as "radial" | "grid" | "cluster")
                    }
                    data={[
                      { label: "Radial", value: "radial" },
                      { label: "Grid", value: "grid" },
                      { label: "Cluster", value: "cluster" },
                    ]}
                  />
                </Group>
                {graphTypes.length ? (
                  <Group gap="xs" wrap="wrap">
                    <Badge size="xs" variant="outline">
                      Legend
                    </Badge>
                    {graphTypes.map((type) => {
                      const active = activeTypeSet.has(type);
                      const typeColor = typeColorMap[type] || "indigo";
                      return (
                        <Button
                          key={type}
                          size="xs"
                          variant={active ? "light" : "subtle"}
                          color={typeColor}
                          onClick={() =>
                            setActiveTypes((prev) =>
                              prev.includes(type)
                                ? prev.filter((value) => value !== type)
                                : [...prev, type],
                            )
                          }
                        >
                          {type}
                        </Button>
                      );
                    })}
                  </Group>
                ) : null}
                <TextInput
                  placeholder="Search entities"
                  value={nodeQuery}
                  onChange={(event) => setNodeQuery(event.currentTarget.value)}
                />
                {pinnedEntities.length ? (
                  <Stack gap={6}>
                    <Text size="xs" c="dimmed">
                      Pinned entities
                    </Text>
                    <Group gap="xs" wrap="wrap">
                      {sortedNodes
                        .filter((node) => pinnedEntities.includes(node.id))
                        .map((node) => (
                          <Button
                            key={node.id}
                            variant="light"
                            size="xs"
                            color={typeColorMap[node.type] || "indigo"}
                            onClick={() => setSelectedEntityId(node.id)}
                          >
                            {node.label}
                          </Button>
                        ))}
                    </Group>
                  </Stack>
                ) : null}
                {filteredNodes.length ? (
                  <Group gap="xs" wrap="wrap">
                    {sortedNodes.map((node) => (
                      <Group key={node.id} gap={6}>
                        <Tooltip
                          label={`${node.label} • ${node.type}`}
                          withArrow
                        >
                          <Button
                            variant={selectedEntityId === node.id ? "light" : "subtle"}
                            size="xs"
                            color={typeColorMap[node.type] || "indigo"}
                            onClick={() => setSelectedEntityId(node.id)}
                            onMouseEnter={() => setHoveredEntityId(node.id)}
                            onMouseLeave={() => setHoveredEntityId(null)}
                          >
                            {node.label}
                          </Button>
                        </Tooltip>
                        <Badge size="xs" variant="light">
                          {node.count}
                        </Badge>
                        {node.lastSeen ? (
                          <Badge size="xs" variant="outline">
                            {formatLastSeen(node.lastSeen)}
                          </Badge>
                        ) : null}
                        {pinnedEntities.includes(node.id) ? (
                          <Badge size="xs" color="yellow" variant="filled">
                            Pinned
                          </Badge>
                        ) : null}
                      </Group>
                    ))}
                  </Group>
                ) : (
                  <Text size="xs" c="dimmed">
                    No entities match that search.
                  </Text>
                )}
                {hoveredEntityId && hoveredEntityQuery.data?.length ? (
                  <Text size="xs" c="dimmed">
                    Preview:{" "}
                    {hoveredEntityQuery.data[0].summary ||
                      renderMemoryContent(hoveredEntityQuery.data[0].content) ||
                      "No preview"}
                  </Text>
                ) : null}
                <Text size="xs" c="dimmed">
                  Entities appear as nodes. Heavier lines indicate topics that co-occur in the same memories.
                </Text>
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                No entities captured yet. Add tagged memories or agent notes to grow this graph.
              </Text>
            )}
          </Card>
        </Group>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Entity collections</Title>
            <Group gap="xs">
              <Button
                size="xs"
                variant="subtle"
                leftSection={
                  collectionsCollapsed ? (
                    <IconChevronRight size={14} />
                  ) : (
                    <IconChevronDown size={14} />
                  )
                }
                onClick={() => setCollectionsCollapsed((prev) => !prev)}
              >
                {collectionsCollapsed ? "Expand" : "Collapse"}
              </Button>
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  setCollectionMode("create");
                  setCollectionOriginalName(null);
                  setCollectionName("");
                  setCollectionEntityIds([]);
                  setCollectionModalOpen(true);
                }}
              >
                New collection
              </Button>
            </Group>
          </Group>
          <Text size="xs" c="dimmed" mb="sm">
            Group related entities for fast recall and navigation.
          </Text>
          {collectionsCollapsed ? (
            <Text size="sm" c="dimmed">
              {collections.length
                ? `${collections.length} collections hidden.`
                : "No collections yet."}
            </Text>
          ) : collectionsQuery.isLoading ? (
            <Text size="sm" c="dimmed">
              Loading collections...
            </Text>
          ) : collections.length ? (
            <Stack gap="xs">
              {collections.map((collection) => (
                <Card key={collection.name} withBorder radius="sm" p="sm">
                  <Stack gap={6}>
                    <Group justify="space-between" align="flex-start">
                      <Text size="sm" fw={600}>
                        {collection.name}
                      </Text>
                      <Group gap="xs">
                        <Badge size="xs" variant="light">
                          {collection.entityIds.length}
                        </Badge>
                        {collection.updatedAt ? (
                          <Text size="xs" c="dimmed">
                            Updated{" "}
                            {new Date(collection.updatedAt).toLocaleDateString()}
                          </Text>
                        ) : null}
                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon variant="subtle" size="sm">
                              <IconDotsVertical size={14} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              onClick={() => {
                                setCollectionMode("edit");
                                setCollectionOriginalName(collection.name);
                                setCollectionName(collection.name);
                                setCollectionEntityIds(collection.entityIds);
                                setCollectionModalOpen(true);
                              }}
                            >
                              Rename or edit
                            </Menu.Item>
                            <Menu.Item
                              color="red"
                              onClick={() =>
                                deleteCollectionMutation.mutate(collection.name)
                              }
                            >
                              Delete
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Group>
                    <Group gap="xs" wrap="wrap">
                      {collection.entityIds.map((entityId) => {
                        const entity = graphNodes.find((node) => node.id === entityId);
                        return (
                          <Button
                            key={entityId}
                            size="xs"
                            variant="light"
                            color={typeColorMap[entity?.type || ""] || "indigo"}
                            onClick={() => setSelectedEntityId(entityId)}
                          >
                            {entity?.label || "Entity"}
                          </Button>
                        );
                      })}
                    </Group>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              No collections yet.
            </Text>
          )}
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Autonomy analytics</Title>
            <Text size="xs" c="dimmed">
              Recent loop activity
            </Text>
          </Group>
          {autonomyStatsQuery.isLoading ? (
            <Text size="sm" c="dimmed">
              Loading analytics...
            </Text>
          ) : autonomyStats.trend.length ? (
            <Stack gap="sm">
              <Group gap="lg">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Total actions
                  </Text>
                  <Text size="sm" fw={600}>
                    {autonomyStats.totalActions}
                  </Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Approvals
                  </Text>
                  <Text size="sm" fw={600}>
                    {autonomyStats.approvals}
                  </Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Applied
                  </Text>
                  <Text size="sm" fw={600}>
                    {autonomyStats.applied}
                  </Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Failed
                  </Text>
                  <Text size="sm" fw={600}>
                    {autonomyStats.failed}
                  </Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Denied
                  </Text>
                  <Text size="sm" fw={600}>
                    {autonomyStats.denied}
                  </Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Skipped
                  </Text>
                  <Text size="sm" fw={600}>
                    {autonomyStats.skipped}
                  </Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Retries
                  </Text>
                  <Text size="sm" fw={600}>
                    {autonomyStats.retries}
                  </Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Avg approval (min)
                  </Text>
                  <Text size="sm" fw={600}>
                    {approvalLatency ? approvalLatency.toFixed(1) : "—"}
                  </Text>
                </Stack>
              </Group>
              <Box
                component="svg"
                w="100%"
                h={120}
                viewBox="0 0 420 120"
                style={{ borderRadius: 12, border: `1px solid ${theme.colors.gray[8]}` }}
              >
                {(() => {
                  const max = Math.max(...autonomyStats.trend.map((item) => item.count), 1);
                  const barWidth = 420 / autonomyStats.trend.length;
                  return autonomyStats.trend.map((item, index) => {
                    const height = (item.count / max) * 90;
                    const x = index * barWidth + 8;
                    const y = 100 - height;
                    return (
                      <g key={item.day}>
                        <rect
                          x={x}
                          y={y}
                          width={Math.max(barWidth - 12, 6)}
                          height={height}
                          fill={theme.colors.blue[5]}
                          rx={4}
                        />
                        <text
                          x={x + 4}
                          y={112}
                          fontSize="9"
                          fill={theme.colors.gray[5]}
                        >
                          {item.day.split("/")[1] || item.day}
                        </text>
                      </g>
                    );
                  });
                })()}
              </Box>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              No autonomy analytics yet.
            </Text>
          )}
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Autonomy history</Title>
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Recent autonomous loops
              </Text>
              <Button
                size="xs"
                variant="subtle"
                leftSection={
                  autonomyCollapsed ? (
                    <IconChevronRight size={14} />
                  ) : (
                    <IconChevronDown size={14} />
                  )
                }
                onClick={() => setAutonomyCollapsed((prev) => !prev)}
              >
                {autonomyCollapsed ? "Expand" : "Collapse"}
              </Button>
            </Group>
          </Group>
          {autonomyCollapsed ? (
            <Text size="sm" c="dimmed">
              {filteredHistory.length
                ? `${filteredHistory.length} autonomy entries hidden.`
                : "No autonomy runs yet."}
            </Text>
          ) : (
            <>
              <SegmentedControl
                size="xs"
                value={historyFilter}
                onChange={setHistoryFilter}
                data={[
                  { label: "All", value: "all" },
                  { label: "Approvals", value: "approvals" },
                  { label: "Applied", value: "applied" },
                  { label: "Failed", value: "failed" },
                ]}
                mb="sm"
              />
              {autonomyHistoryQuery.isLoading ? (
                <Text size="sm" c="dimmed">
                  Loading history...
                </Text>
              ) : filteredHistory.length ? (
                <Stack gap="xs">
                  {filteredHistory.map((entry) => {
                    const content = entry.content as Record<string, any> | undefined;
                    const actions = Array.isArray(content?.actions)
                      ? content?.actions
                      : [];
                    const approvals = actions.filter((action: any) =>
                      String(action.status || "").startsWith("approval:"),
                    ).length;
                    const applied = actions.filter((action: any) => action.status === "applied").length;
                    const failed = actions.filter((action: any) => action.status === "failed").length;
                    const denied = actions.filter((action: any) =>
                      String(action.status || "").startsWith("denied:"),
                    ).length;
                    const skipped = actions.filter((action: any) =>
                      String(action.status || "").startsWith("skipped:"),
                    ).length;
                    const retries = actions.reduce((total: number, action: any) => {
                      const attempts = Number(action.attempts || 1);
                      return total + Math.max(attempts - 1, 0);
                    }, 0);
                    return (
                      <Card key={entry.id} withBorder radius="sm" p="sm">
                        <Stack gap={4}>
                          <Group justify="space-between">
                            <Text size="sm" fw={600}>
                              {entry.summary || "Autonomy run"}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {entry.timestamp
                                ? new Date(entry.timestamp).toLocaleString()
                                : ""}
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed">
                            Actions: {actions.length}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Approvals: {approvals} · Applied: {applied} · Failed: {failed} · Denied: {denied} · Skipped: {skipped}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Retries: {retries}
                          </Text>
                        </Stack>
                      </Card>
                    );
                  })}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  No autonomy runs yet.
                </Text>
              )}
            </>
          )}
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Timeline</Title>
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Activity across memories and events
              </Text>
              <Button
                size="xs"
                variant="subtle"
                leftSection={
                  timelineCollapsed ? (
                    <IconChevronRight size={14} />
                  ) : (
                    <IconChevronDown size={14} />
                  )
                }
                onClick={() => setTimelineCollapsed((prev) => !prev)}
              >
                {timelineCollapsed ? "Expand" : "Collapse"}
              </Button>
            </Group>
          </Group>
          {timelineCollapsed ? (
            <Text size="sm" c="dimmed">
              {memoriesQuery.data?.length
                ? `${memoriesQuery.data.length} memory entries across ${groupedEntries.length} days hidden.`
                : "No memories recorded yet."}
            </Text>
          ) : memoriesQuery.isLoading ? (
            <Text size="sm" c="dimmed">
              Loading timeline...
            </Text>
          ) : groupedEntries.length ? (
            <Stack gap="md">
              {groupedEntries.map(([date, entries]) => (
                <Stack key={date} gap="xs">
                  <Text size="xs" fw={600} c="dimmed">
                    {date}
                  </Text>
                  {entries.map((entry) => (
                    <Card key={entry.id} withBorder radius="sm" p="sm">
                      <Stack gap={4}>
                        <Group justify="space-between">
                          <Text size="sm" fw={600}>
                            {entry.summary || "Memory entry"}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {entry.timestamp
                              ? new Date(entry.timestamp).toLocaleTimeString()
                              : ""}
                          </Text>
                        </Group>
                        {entry.tags?.length ? (
                          <Group gap={6}>
                            {entry.tags.map((tag) => (
                              <Badge key={tag} size="xs" variant="light">
                                {tag}
                              </Badge>
                            ))}
                          </Group>
                        ) : null}
                        {entry.source ? (
                          <Text size="xs" c="dimmed">
                            Source: {entry.source}
                          </Text>
                        ) : null}
                        {entry.content ? (
                          <TypographyStylesProvider className={classes.markdown}>
                            <div
                              dangerouslySetInnerHTML={{
                                __html: markdownToHtml(getContentText(entry.content)),
                              }}
                            />
                          </TypographyStylesProvider>
                        ) : null}
                        {entry.content ? (
                          <Group justify="flex-end">
                            <Button
                              variant="subtle"
                              size="xs"
                              onClick={() =>
                                setExpandedId((current) =>
                                  current === entry.id ? null : entry.id,
                                )
                              }
                            >
                              {expandedId === entry.id ? "Hide details" : "Details"}
                            </Button>
                          </Group>
                        ) : null}
                        {expandedId === entry.id && entry.content ? (
                          <Text size="xs" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(entry.content, null, 2)}
                          </Text>
                        ) : null}
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              No memories recorded yet.
            </Text>
          )}
        </Card>
      </Stack>
      <Drawer
        opened={Boolean(selectedEntityId)}
        onClose={() => setSelectedEntityId(null)}
        position="right"
        size="md"
        title="Entity detail"
      >
        <Stack gap="sm">
          {selectedEntityDetails.data?.entity ? (
            <Card withBorder radius="sm" p="sm">
              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  {selectedEntityDetails.data.entity.name}
                </Text>
                <Group gap="xs">
                  <Badge size="xs" variant="light">
                    {selectedEntityDetails.data.entity.type}
                  </Badge>
                  <Badge size="xs" variant="light">
                    {selectedEntityDetails.data.entity.count} memories
                  </Badge>
                  <Badge size="xs" variant="outline">
                    Last seen {formatLastSeen(selectedEntityDetails.data.entity.lastSeen)}
                  </Badge>
                </Group>
              </Stack>
            </Card>
          ) : null}
          <Card withBorder radius="sm" p="sm">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                Quick actions
              </Text>
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  if (!selectedEntityId) return;
                  const action = pinnedEntities.includes(selectedEntityId)
                    ? "unpin"
                    : "pin";
                  pinMutation.mutate(action);
                }}
                loading={pinMutation.isPending}
              >
                {selectedEntityId && pinnedEntities.includes(selectedEntityId)
                  ? "Unpin"
                  : "Pin"}
              </Button>
            </Group>
            <Group mt="xs">
              <Button
                size="xs"
                variant="light"
                onClick={() => setTaskModalOpen(true)}
              >
                Create task
              </Button>
              <Button
                size="xs"
                variant="light"
                onClick={() => setGoalModalOpen(true)}
              >
                Create goal
              </Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => {
                  if (!selectedEntityDetails.data?.entity) return;
                  const payload = {
                    entity: selectedEntityDetails.data.entity,
                    memories: selectedEntityDetails.data.memories,
                  };
                  const blob = new Blob([JSON.stringify(payload, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = `${selectedEntityDetails.data.entity.name}-entity.json`;
                  anchor.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export JSON
              </Button>
            </Group>
            <Group mt="sm" align="flex-end">
              <TextInput
                label="Tags"
                placeholder="wellness, research"
                value={tagDraft}
                onChange={(event) => setTagDraft(event.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  const tags = tagDraft
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                  if (!tags.length) return;
                  tagMutation.mutate(tags);
                }}
                loading={tagMutation.isPending}
              >
                Save tags
              </Button>
            </Group>
          </Card>
          {relatedEntities.length ? (
            <Card withBorder radius="sm" p="sm">
              <Text size="sm" fw={600} mb={6}>
                Related entities
              </Text>
              <Group gap="xs" wrap="wrap">
                {relatedEntities.map((entity) => (
                  <Button
                    key={entity.id}
                    size="xs"
                    variant="light"
                    color={typeColorMap[entity.type] || "indigo"}
                    onClick={() => setSelectedEntityId(entity.id)}
                  >
                    {entity.label}
                  </Button>
                ))}
              </Group>
            </Card>
          ) : null}
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              Linked memories
            </Text>
            {selectedEntityDetails.isLoading ? <Loader size="xs" /> : null}
          </Group>
          {selectedEntityDetails.data?.memories?.length ? (
            <Stack gap="sm">
              {selectedEntityDetails.data.memories.map((entry) => {
                const pageId = extractPageId(entry.content);
                return (
                <Card key={entry.id} withBorder radius="sm" p="sm">
                  <Stack gap={4}>
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        {entry.summary || "Memory entry"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {entry.timestamp
                          ? new Date(entry.timestamp).toLocaleString()
                          : ""}
                      </Text>
                    </Group>
                    {entry.tags?.length ? (
                      <Group gap={6}>
                        {entry.tags.map((tag) => (
                          <Badge key={tag} size="xs" variant="light">
                            {tag}
                          </Badge>
                        ))}
                      </Group>
                    ) : null}
                    {entry.content ? (
                      <TypographyStylesProvider className={classes.markdown}>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: markdownToHtml(getContentText(entry.content)),
                          }}
                        />
                      </TypographyStylesProvider>
                    ) : null}
                    {pageId ? (
                      <Group justify="flex-end">
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => navigate(`/p/${pageId}`)}
                        >
                          Open page
                        </Button>
                      </Group>
                    ) : null}
                  </Stack>
                </Card>
              )})}
            </Stack>
          ) : selectedEntityId ? (
            <Text size="xs" c="dimmed">
              No memories linked yet.
            </Text>
          ) : null}
        </Stack>
      </Drawer>
      <Modal opened={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Create task">
        <Stack gap="sm">
          <TextInput
            label="Title"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.currentTarget.value)}
            placeholder={selectedEntityDetails.data?.entity?.name || "New task"}
          />
          <Select
            label="Project"
            placeholder="Optional"
            data={projectOptions}
            value={taskProjectId}
            onChange={setTaskProjectId}
            searchable
            clearable
          />
          <Textarea
            label="Description"
            value={taskDescription}
            onChange={(event) => setTaskDescription(event.currentTarget.value)}
            minRows={3}
          />
          <Group justify="flex-end">
            <Button
              onClick={() => createTaskMutation.mutate()}
              loading={createTaskMutation.isPending}
            >
              Create task
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={goalModalOpen} onClose={() => setGoalModalOpen(false)} title="Create goal">
        <Stack gap="sm">
          <TextInput
            label="Name"
            value={goalName}
            onChange={(event) => setGoalName(event.currentTarget.value)}
            placeholder={selectedEntityDetails.data?.entity?.name || "New goal"}
          />
          <Select
            label="Horizon"
            data={[
              { value: "short", label: "Short-term" },
              { value: "mid", label: "Mid-term" },
              { value: "long", label: "Long-term" },
            ]}
            value={goalHorizon}
            onChange={(value) => setGoalHorizon(value || "short")}
          />
          <Textarea
            label="Description"
            value={goalDescription}
            onChange={(event) => setGoalDescription(event.currentTarget.value)}
            minRows={3}
          />
          <TextInput
            label="Keywords"
            placeholder="comma, separated, keywords"
            value={goalKeywords}
            onChange={(event) => setGoalKeywords(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              onClick={() => createGoalMutation.mutate()}
              loading={createGoalMutation.isPending}
            >
              Create goal
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        title={
          collectionMode === "edit" ? "Edit entity collection" : "New entity collection"
        }
      >
        <Stack gap="sm">
          <TextInput
            label="Collection name"
            value={collectionName}
            onChange={(event) => setCollectionName(event.currentTarget.value)}
          />
          <MultiSelect
            label="Entities"
            data={entityOptions}
            value={collectionEntityIds}
            onChange={setCollectionEntityIds}
            searchable
            clearable
          />
          <Group justify="space-between">
            <Button
              size="xs"
              variant="subtle"
              onClick={() => setCollectionEntityIds(pinnedEntities)}
            >
              Use pinned entities
            </Button>
            <Button
              onClick={() => saveCollectionMutation.mutate()}
              loading={saveCollectionMutation.isPending}
              disabled={!collectionName.trim() || !collectionEntityIds.length}
            >
              {collectionMode === "edit" ? "Update collection" : "Save collection"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
