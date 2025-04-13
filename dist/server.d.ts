import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
/**
 * Start the MCP server with configured transports
 * The server can use either stdio (for VS Code extension) or HTTP (for browser clients)
 *
 * @param developerMode Whether to enable developer tools and resources
 */
export declare function startServer(developerMode?: boolean): Promise<McpServer>;
