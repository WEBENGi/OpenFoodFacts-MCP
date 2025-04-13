import express from "express";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { PORT } from "../config/server-config.js";
/**
 * Custom logger that writes to stderr instead of stdout to avoid interfering with JSON communication
 */
export const logger = {
    log: (message) => console.error(`[INFO] ${message}`),
    info: (message) => console.error(`[INFO] ${message}`),
    warn: (message) => console.error(`[WARN] ${message}`),
    error: (message, error) => {
        if (error instanceof Error) {
            console.error(`[ERROR] ${message}`, error.stack || error.message);
        }
        else {
            console.error(`[ERROR] ${message}`, error);
        }
    }
};
/**
 * Setup stdio transport for command line usage
 * @param server MCP server instance
 */
export function setupStdioTransport(server) {
    const transport = new StdioServerTransport();
    return server.connect(transport).then(() => {
        // Use stderr instead of stdout for logs
        logger.info("Open Food Facts MCP Server started with stdio transport");
    }).catch(error => {
        logger.error("Error starting MCP server with stdio transport:", error);
        process.exit(1);
    });
}
/**
 * Setup HTTP/SSE transport for web-based clients
 * @param server MCP server instance
 * @param app Express application
 */
export function setupHttpTransport(server, app) {
    return new Promise((resolve, reject) => {
        try {
            let transport = null;
            // SSE endpoint - establish SSE connection
            app.get("/sse", (req, res) => {
                res.setHeader("Cache-Control", "no-cache");
                res.setHeader("Content-Type", "text/event-stream");
                res.setHeader("Connection", "keep-alive");
                res.setHeader("Access-Control-Allow-Origin", "*");
                transport = new SSEServerTransport("/messages", res);
                res.on("close", () => {
                    logger.info("SSE connection closed");
                    transport = null;
                });
                server.connect(transport).catch(error => {
                    logger.error("Error connecting SSE transport:", error);
                    reject(error);
                });
            });
            app.post("/messages", express.json(), (req, res) => {
                if (transport) {
                    transport.handlePostMessage(req, res);
                }
                else {
                    res.status(400).send('No active SSE connection found');
                }
            });
            // Express routes for health checking
            app.get('/', (_, res) => {
                res.send('Open Food Facts MCP Server is running');
            });
            app.get('/health', (_, res) => {
                res.json({ status: 'UP', version: '1.0.0' });
            });
            app.listen(PORT, () => {
                logger.info(`Open Food Facts MCP Server running on HTTP port ${PORT}`);
                logger.info(`Use SSE endpoint at http://localhost:${PORT}/sse`);
                logger.info(`Client-to-server messages should be POSTed to http://localhost:${PORT}/messages`);
                resolve();
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
