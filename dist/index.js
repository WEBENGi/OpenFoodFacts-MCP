import { startServer } from "./server.js";
import { logger } from "./transport/transports.js";
/**
 * Main entry point for the Open Food Facts MCP Server
 */
startServer().catch((error) => {
    logger.error("Failed to start MCP server:", error);
    process.exit(1);
});
