import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerIssueMatcher } from "./issue-matcher.js";
import { registerPrGenerator } from "./pr-generator.js";
import { registerTestGenerator } from "./test-case-generator.js";
import { registerGitHelper } from "./git-workflow-helper.js";

/**
 * Registers all contributor assistance tools with the MCP server
 * @param server The MCP server instance to register the tools with
 */
export function registerContributorTools(server: McpServer) {
    try {
        registerIssueMatcher(server);
        
        registerPrGenerator(server);
        
        registerTestGenerator(server);
        
        registerGitHelper(server);
    } catch (error) {
        console.error(`Error registering contributor tools: ${error instanceof Error ? error.message : String(error)}`);
    }
}