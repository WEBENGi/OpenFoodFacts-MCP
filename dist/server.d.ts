import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
/**
 * Start the MCP server with configured transports
 * The server can use either stdio (for VS Code extension) or HTTP (for browser clients)
 */
export declare function startServer(): Promise<McpServer>;
