# Docmost MCP Extensions Documentation

## Overview

This collection of documents provides comprehensive documentation for the Model Context Protocol (MCP) and Master Control API extensions developed for Docmost by HaruHunab1320.

These extensions enable AI assistants to interact directly with Docmost, allowing for automated content management, real-time collaboration between AI and humans, and programmatic control of the user interface.

## Available Documentation

### 1. [Codebase Review](./CodebaseReview.md)

A high-level overview of the entire codebase, focusing on:
- System architecture
- Core components 
- Extension components
- Potential issues and next steps

### 2. [API Key Authentication System](./APIKeySystem.md)

Detailed explanation of the API key authentication system:
- Key structure and generation
- Storage and security
- Authentication flow
- Implementation details

### 3. [Master Control API: JSON-RPC 2.0 Server](./MasterControlAPI.md)

Comprehensive documentation of the JSON-RPC 2.0 server implementation:
- Architecture and components
- Request and response formats
- Method structure and implementation
- Authentication and authorization
- Complete API reference

### 4. [Model Context Protocol Integration](./MCPIntegration.md)

In-depth documentation of the MCP integration:
- Architecture and components
- Bridge implementation
- Parameter handling
- Tool categories and capabilities
- Extension guide

### 5. [WebSocket Events System](./MCPEvents.md)

Details on the real-time event system:
- Architecture and components
- Event types and structure
- Server implementation
- Client implementation
- Testing and usage

## Key Concepts

### Master Control API

The Master Control API provides a JSON-RPC 2.0 interface to all Docmost functionality. It serves as the foundation for the MCP integration, allowing AI assistants and other clients to programmatically:

- Manage spaces, pages, and comments
- Upload and manage attachments
- Control user and group permissions
- Navigate the UI

All operations are authenticated and authorized based on user permissions or API keys.

### Model Context Protocol Bridge

The MCP Bridge adapts the Master Control API for consumption by AI assistants that support the Model Context Protocol. It:

- Registers tools with the MCP server
- Validates and transforms parameters
- Formats responses for AI consumption
- Handles authentication via API keys

### Real-time Events

The WebSocket events system enables real-time notifications for changes made through the MCP API, allowing:

- UI updates when AI assistants make changes
- Seamless integration between AI and human actions
- Enhanced collaboration between users and AI assistants

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Master Control API | Complete | All core resources implemented |
| MCP Bridge | Complete | Supports all API operations |
| WebSocket Events | Complete | Supports all major event types |
| UI Navigation | Complete | Allows AI to navigate the interface |
| API Key Management | Complete | Secure key generation and validation |

## Next Steps

1. **Code Refactoring**: Split large files, standardize error handling
2. **Documentation**: Complete API reference, developer guides
3. **Testing**: Unit and integration tests
4. **Feature Enhancements**: Context gathering, error handling

## Contributing

To contribute to the MCP extensions:

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests
5. Submit a pull request

## License

The Docmost MCP extensions are licensed under the same license as the core Docmost project (AGPL 3.0). 