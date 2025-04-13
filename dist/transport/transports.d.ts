import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare const logger: {
    _stdioMode: boolean;
    _logFile: string;
    _writeToFile(message: string): void;
    log: (message: string) => void;
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string, error?: unknown) => void;
};
/**
 * Setup stdio transport for command line usage
 * @param server MCP server instance
 */
export declare function setupStdioTransport(server: McpServer): Promise<void>;
/**
 * Setup HTTP/SSE transport for web-based clients
 * @param server MCP server instance
 * @param app Express application
 */
export declare function setupHttpTransport(server: McpServer, app: express.Application): Promise<void>;
