import { registerCodebaseNavigatorTools } from "./register-codebase-navigator.js";
import { registerContributorTools } from "./register-contributor-tools.js";
import { registerProductTools } from "./product-search.js";
import { registerGitHubTools } from "./github-issues-tool.js";
import { registerAIAnalysisTools } from "./ai-analysis-tool.js";
/**
 * Register all MCP server tools
 * @param server The MCP server instance to register tools with
 */
export function registerAllTools(server) {
    // Register product-related tools
    registerProductTools(server);
    // Register GitHub-related tools
    registerGitHubTools(server);
    // Register AI analysis tools
    registerAIAnalysisTools(server);
    // Register codebase navigation tools
    registerCodebaseNavigatorTools(server);
    // Register contributor assistance tools
    registerContributorTools(server);
}
