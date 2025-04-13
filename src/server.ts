import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from 'express';
import { setupStdioTransport, setupHttpTransport, logger } from './transport/transports.js';
import { serverConfig } from './config/server-config.js';
import { availableResources, routeResourceRequest, filterResourcesForStandardMode } from './resources/resource-registry.js';
import { registerTools } from './tools/index.js';
import { registerCodebaseNavigatorTools } from './tools/register-codebase-navigator.js';
import { registerContributorTools } from './tools/register-contributor-tools.js';
import { availablePrompts, getPromptMessages, filterPromptsForStandardMode } from './prompts/index.js';
import { setupRoots } from './roots/index.js';

/**
 * Start the MCP server with configured transports
 * The server can use either stdio (for VS Code extension) or HTTP (for browser clients)
 * 
 * @param developerMode Whether to enable developer tools and resources
 */
export async function startServer(developerMode = false) {
  // Initialize the MCP server with our config using McpServer
  const server = new McpServer(serverConfig, {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
      sampling: {},
      roots: {}
    }
  });

  // Setup roots handling
  setupRoots(server);

  // Register core MCP tools (always enabled)
  registerTools(server, developerMode);
  
  // Conditionally register developer tools
  if (developerMode) {
    // Register Codebase Navigator tools for open source contributors
    registerCodebaseNavigatorTools(server);
    
    // Register custom contributor tools
    registerContributorTools(server);
    
    logger.info('Developer mode enabled: Contributor tools registered');
  }

  // Set up resource listing handler
  server.server.setRequestHandler(ListResourcesRequestSchema, async () => {
    // If not in developer mode, filter out developer-only resources
    const resources = developerMode ? 
      availableResources : 
      filterResourcesForStandardMode(availableResources);
      
    return {
      resources: resources
    };
  });

  // Set up resource reading handler
  server.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    return await routeResourceRequest(uri, developerMode);
  });

  // Set up prompts listing handler
  server.server.setRequestHandler(ListPromptsRequestSchema, async () => {
    // If not in developer mode, filter out developer-only prompts
    const prompts = developerMode ? 
      availablePrompts : 
      filterPromptsForStandardMode(availablePrompts);
      
    return {
      prompts: prompts
    };
  });

  // Set up prompt retrieval handler
  server.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptName = request.params.name;
    const args = request.params.arguments;
    
    try {
      const messages = await getPromptMessages(promptName, args);
      return {
        messages
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get prompt: ${errorMessage}`);
    }
  });

  // Check if we should use stdio or HTTP transport
  // Stdio is used for VS Code extension
  if (process.env.TRANSPORT === 'stdio') {
    await setupStdioTransport(server);
  } else {
    // HTTP is default, used for browser clients
    const app = express();
    await setupHttpTransport(server, app);
  }

  return server;
}