# MCP WebSocket Events System

For MCP overview and tooling, see `docs/MCP.md`.

## Overview

The MCP WebSocket Events System is a real-time notification system that allows clients to receive updates about changes made through the Model Context Protocol (MCP) API. This enables seamless integration between AI assistant actions and the user interface.

## Architecture

The events system consists of three main components:

1. **Server-side Event Service**: Emits events when MCP operations are performed
2. **WebSocket Gateway**: Broadcasts events to connected clients
3. **Client-side Event Hooks**: React hooks that consume events and update the UI

```
┌─────────────┐    ┌───────────────┐    ┌──────────────┐    ┌─────────────┐
│             │    │               │    │              │    │             │
│ MCP Handler │───>│ Event Service │───>│ WS Gateway   │───>│ Client Hooks│
│             │    │               │    │              │    │             │
└─────────────┘    └───────────────┘    └──────────────┘    └─────────────┘
    (Action)          (Emit Event)      (Broadcast Event)    (Update UI)
```

## Event Types

Events are categorized by resource type and operation:

```typescript
export enum MCPEventType {
  // Space events
  SPACE_CREATED = 'space.created',
  SPACE_UPDATED = 'space.updated',
  SPACE_DELETED = 'space.deleted',
  
  // Page events
  PAGE_CREATED = 'page.created',
  PAGE_UPDATED = 'page.updated',
  PAGE_DELETED = 'page.deleted',
  PAGE_MOVED = 'page.moved',
  
  // Comment events
  COMMENT_CREATED = 'comment.created',
  COMMENT_UPDATED = 'comment.updated',
  COMMENT_DELETED = 'comment.deleted',
  
  // UI events
  UI_NAVIGATE = 'ui.navigate',
  
  // Other events...
}
```

## Event Structure

Each event follows a standard structure:

```typescript
export interface MCPEvent {
  // Event type (e.g., 'space.created')
  type: MCPEventType;
  
  // Resource type (e.g., 'space', 'page')
  resourceType: MCPResourceType;
  
  // Operation type (e.g., 'create', 'update')
  operationType: MCPOperationType;
  
  // Workspace ID for scope
  workspaceId: string;
  
  // Event data (varies by event type)
  data: SpaceEventData | PageEventData | CommentEventData | UIEventData | any;
  
  // Timestamp
  timestamp?: string;
  
  // User who triggered the event (if available)
  userId?: string;
}
```

## Server Implementation

### 1. Event Service

The `MCPEventService` is responsible for creating and emitting events:

```typescript
@Injectable()
export class MCPEventService {
  constructor(
    @InjectEventEmitter() private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Emit an MCP event
   */
  emitEvent(event: MCPEvent): void {
    // Add timestamp if not provided
    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    
    this.logger.debug(
      `Emitting MCP event: ${event.type} for workspace ${event.workspaceId}`,
    );
    
    // Emit the event
    this.eventEmitter.emit(
      'mcp:event',
      eventWithTimestamp,
    );
  }
}
```

### 2. WebSocket Gateway

The `MCPWebSocketGateway` handles client connections and broadcasts events:

```typescript
@WebSocketGateway({
  namespace: 'mcp',
  cors: {
    origin: '*',
  },
})
export class MCPWebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;
  
  // Handle connection event
  handleConnection(client: Socket, ...args: any[]): any {
    // Authenticate client
    // Join workspace room
  }
  
  // Subscribe to MCP events
  @OnEvent('mcp:event')
  handleMCPEvent(event: MCPEvent): void {
    // Broadcast to workspace room
    this.server.to(`workspace:${event.workspaceId}`).emit('mcp:event', event);
  }
}
```

### 3. Event Emission from Handlers

MCP handlers emit events when operations are performed:

```typescript
async createSpace(params: any, userId: string): Promise<any> {
  // Create space logic...
  
  // Emit event after successful creation
  this.mcpEventService.emitEvent({
    type: MCPEventType.SPACE_CREATED,
    resourceType: MCPResourceType.SPACE,
    operationType: MCPOperationType.CREATE,
    workspaceId: params.workspaceId,
    userId,
    data: {
      space: createdSpace,
    },
  });
  
  return { space: createdSpace };
}
```

## Client Implementation

### 1. Socket Connection

The `use-mcp-socket.ts` hook manages the WebSocket connection:

```typescript
export const useMCPSocket = (workspaceId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { token } = useAuth();
  
  useEffect(() => {
    if (!workspaceId || !token) return;
    
    // Create socket connection
    const socket = io(`${getBackendUrl()}/mcp`, {
      query: { workspaceId },
      auth: { token },
    });
    
    socket.on('connect', () => {
      console.log('Connected to MCP WebSocket');
    });
    
    setSocket(socket);
    
    return () => {
      socket.disconnect();
    };
  }, [workspaceId, token]);
  
  return socket;
};
```

### 2. Event Handling

The `use-mcp-events.ts` hook processes incoming events:

```typescript
export const useMCPEvents = (workspaceId: string) => {
  const socket = useMCPSocket(workspaceId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!socket) return;
    
    // Handle space events
    socket.on('mcp:event', (event: MCPEvent) => {
      console.log('Received MCP event:', event);
      
      // Handle different event types
      switch (event.type) {
        case MCPEventType.SPACE_CREATED:
          // Invalidate spaces query to refresh list
          queryClient.invalidateQueries(['spaces', workspaceId]);
          break;
          
        case MCPEventType.PAGE_UPDATED:
          // Invalidate specific page query
          queryClient.invalidateQueries([
            'page', 
            event.data.page.id
          ]);
          break;
          
        case MCPEventType.UI_NAVIGATE:
          // Handle navigation event
          handleNavigationEvent(event.data, navigate);
          break;
          
        // Handle other events...
      }
    });
    
    return () => {
      socket.off('mcp:event');
    };
  }, [socket, queryClient, workspaceId, navigate]);
};
```

### 3. UI Navigation Handling

A special handler for UI navigation events:

```typescript
const handleNavigationEvent = (data: UIEventData, navigate: NavigateFunction) => {
  const { destination, spaceId, spaceSlug, pageId } = data;
  
  switch (destination) {
    case 'space':
      if (spaceSlug) {
        navigate(`/s/${spaceSlug}`);
      } else if (spaceId) {
        navigate(`/s/${spaceId}`);
      }
      break;
      
    case 'page':
      if (spaceSlug && pageId) {
        navigate(`/s/${spaceSlug}/p/${pageId}`);
      } else if (spaceId && pageId) {
        navigate(`/s/${spaceId}/p/${pageId}`);
      } else if (pageId) {
        navigate(`/p/${pageId}`);
      }
      break;
      
    case 'home':
      navigate('/home');
      break;
      
    case 'dashboard':
      navigate('/dashboard');
      break;
  }
};
```

## Event Data Structures

Different events carry different data payloads:

### Space Events

```typescript
export interface SpaceEventData {
  space?: {
    id: string;
    name: string;
    description?: string;
    slug?: string;
    workspaceId: string;
    createdAt?: string;
    updatedAt?: string;
  };
  spaceId?: string;
}
```

### Page Events

```typescript
export interface PageEventData {
  page?: {
    id: string;
    title: string;
    spaceId: string;
    parentId?: string;
    workspaceId: string;
    createdAt?: string;
    updatedAt?: string;
  };
  pageId?: string;
  newParentId?: string;
  newSpaceId?: string;
}
```

### Comment Events

```typescript
export interface CommentEventData {
  comment?: {
    id: string;
    content: any;
    pageId: string;
    parentCommentId?: string;
    workspaceId: string;
    creatorId: string;
    createdAt?: string;
    updatedAt?: string;
  };
  commentId?: string;
}
```

### UI Events

```typescript
export interface UIEventData {
  destination: 'space' | 'page' | 'home' | 'dashboard';
  spaceId?: string;
  spaceSlug?: string;
  pageId?: string;
  pageSlug?: string;
}
```

## Usage in Components

Components can use the MCP events hook to stay in sync with AI assistant actions:

```tsx
const SpacesList = ({ workspaceId }) => {
  // Set up query for spaces
  const { data: spaces } = useQuery(['spaces', workspaceId], () => 
    fetchSpaces(workspaceId)
  );
  
  // Connect to MCP events
  useMCPEvents(workspaceId);
  
  return (
    <div>
      {spaces?.map(space => (
        <SpaceItem key={space.id} space={space} />
      ))}
    </div>
  );
};
```

## Testing Events

The MCP events system can be tested using a WebSocket client:

```typescript
// Connect to the MCP WebSocket
const socket = io('http://localhost:3000/mcp', {
  query: { workspaceId: 'your-workspace-id' },
  auth: { token: 'your-auth-token' },
});

// Listen for MCP events
socket.on('mcp:event', (event) => {
  console.log('Received event:', event);
});
```

## Next Steps and Improvements

1. **Event Filtering**: Implement more granular event filtering on the client
2. **Optimistic Updates**: Add optimistic UI updates for better responsiveness
3. **Offline Support**: Queue events for offline scenarios
4. **Event History**: Store recent events for late-joining clients
5. **User Indicators**: Show which user (or AI assistant) triggered each event 
