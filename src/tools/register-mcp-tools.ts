import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCodebaseNavigatorTools } from "./register-codebase-navigator.js";
import { registerContributorTools } from "./register-contributor-tools.js";

/**
 * Register all MCP server tools
 * @param server The MCP server instance to register tools with
 */
export function registerMcpTools(server: McpServer) {
    // Register existing codebase navigation tools
    registerCodebaseNavigatorTools(server);

    // Register new contributor assistance tools
    registerContributorTools(server);
}