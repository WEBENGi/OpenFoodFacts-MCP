#!/usr/bin/env node
import { startServer } from './server.js';
import { logger } from './transport/transports.js';
// Parse command line arguments
const args = process.argv.slice(2);
const options = {};
// Parse command line arguments in format --key=value or --flag
for (const arg of args) {
    if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        options[key] = value === undefined ? true : value;
    }
}
// Set transport mode from command line if specified
if (options.transport) {
    process.env.TRANSPORT = options.transport;
}
// Set port from command line if specified
if (options.port) {
    process.env.PORT = options.port;
}
// Start the server
logger.info('Starting Open Food Facts MCP server...');
if (options.transport) {
    logger.info(`Transport mode: ${options.transport}`);
}
// Display enabled capabilities
logger.info('Enabled capabilities:');
logger.info('- Resources: Food product data access');
logger.info('- Tools: Food product search and information');
logger.info('- Prompts: Food product analysis templates');
logger.info('- Sampling: AI-powered food product analysis');
logger.info('- Roots: Resource boundary management');
startServer().catch((error) => {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
});
