// MCP WebSocket client for testing real-time events
const readline = require("readline");
const { io } = require("socket.io-client");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("MCP WebSocket Client for Raven Docs");
console.log("--------------------------------");
console.log(
  "This client will connect to the MCP WebSocket endpoint and display all events"
);
console.log(
  "You need an API key to authenticate. You can create one in Raven Docs settings."
);

rl.question("Enter your MCP API key (starts with 'mcp_'): ", (apiKey) => {
  if (!apiKey.startsWith("mcp_")) {
    console.error("Error: API key must start with 'mcp_'");
    process.exit(1);
  }

  const socket = io("http://localhost:3000/mcp", {
    auth: {
      apiKey: apiKey,
    },
  });

  socket.on("connect", () => {
    console.log("Connected to MCP WebSocket server!");
    console.log("Waiting for page ID to subscribe to...");

    rl.question(
      "Enter page ID to subscribe to (after creating it with the test script): ",
      (pageId) => {
        // Subscribe to page events
        socket.emit("mcp:subscribe", {
          resourceType: "page",
          resourceId: pageId,
        });

        console.log(`Subscribed to events for page: ${pageId}`);
        console.log("Now run the test script and make changes to this page...");
        console.log("Listening for events (Ctrl+C to exit)...");
      }
    );
  });

  socket.on("mcp:event", (event) => {
    console.log("");
    console.log("====== EVENT RECEIVED ======");
    console.log(`Event Type: ${event.type}`);
    console.log(`Resource: ${event.resource}`);
    console.log(`Operation: ${event.operation}`);
    console.log(`Resource ID: ${event.resourceId}`);
    console.log(`Timestamp: ${event.timestamp}`);
    console.log(`User ID: ${event.userId}`);
    console.log(`Workspace ID: ${event.workspaceId}`);
    if (event.spaceId) console.log(`Space ID: ${event.spaceId}`);
    console.log("Data:", JSON.stringify(event.data, null, 2));
    console.log("===========================");
    console.log("");
  });

  socket.on("mcp:connected", (data) => {
    console.log(
      `Successfully authenticated as user ${data.userId} in workspace ${data.workspaceId}`
    );
  });

  socket.on("mcp:subscribed", (data) => {
    console.log(
      `Successfully subscribed to ${data.resourceType} ${data.resourceId}`
    );
  });

  socket.on("mcp:error", (error) => {
    console.error("MCP Error:", error.message);
    if (error.error) console.error("Details:", error.error);
  });

  socket.on("connect_error", (error) => {
    console.error("Connection error:", error.message);
    console.log("Please check your API key and try again.");
    process.exit(1);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from MCP WebSocket server");
    process.exit(0);
  });

  socket.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});
