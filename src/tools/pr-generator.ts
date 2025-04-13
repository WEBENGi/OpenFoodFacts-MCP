import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../transport/transports.js";
import { requestSampling } from "../sampling/sampling-service.js";
import { z } from "zod";
import { readFileWithContext } from "./codebase-navigator.js";

/**
 * Registers the PR Generator tool with the MCP server
 * @param server The MCP server instance to register the tool with
 */
export function registerPrGenerator(server: McpServer) {
    server.tool(
        "generatePR",
        {
            repoPath: z.string().describe("Path to the repository root"),
            issueNumber: z.number().optional().describe("Issue number being addressed"),
            changedFiles: z.array(z.string()).describe("Files that were changed"),
            branchName: z.string().describe("Name of the branch containing changes")
        },
        async ({ repoPath, issueNumber, changedFiles, branchName }) => {
            try {
                if (!repoPath || !branchName || changedFiles.length === 0) {
                    return {
                        isError: true,
                        content: [{ type: "text", text: "Please provide repository path, branch name, and changed files." }]
                    };
                }

                // Get the changes for each file
                const fileChanges: Record<string, string> = {};
                for (const file of changedFiles) {
                    try {
                        const fileContent = await readFileWithContext(repoPath, file);
                        fileChanges[file] = fileContent.content;
                    } catch (error) {
                        logger.error(`Error reading file: ${file}`, error);
                    }
                }

                // Create AI prompt to generate PR description
                const systemPrompt = 
                    "You are an expert developer helping to create a clear and comprehensive pull request. " +
                    "Based on the code changes, generate a well-structured PR description that explains the changes, " +
                    "their purpose, and any important implementation details.";

                const samplingRequest = {
                    messages: [{
                        role: "user" as const,
                        content: {
                            type: "text" as const,
                            text: `Generate a pull request description for these changes:
${Object.entries(fileChanges).map(([file, content]) => `
--- ${file} ---
${content}`).join('\n')}

${issueNumber ? `This PR addresses issue #${issueNumber}` : ''}

Please include:
1. A clear title
2. Description of changes
3. Testing performed
4. Any breaking changes
5. Screenshots or examples (if applicable)`
                        }
                    }],
                    modelPreferences: {
                        hints: [{ name: "claude-3" }, { name: "gpt-4" }],
                        intelligencePriority: 0.8,
                        speedPriority: 0.4
                    },
                    systemPrompt,
                    includeContext: "thisServer" as const,
                    temperature: 0.2,
                    maxTokens: 2000
                };

                const aiResponse = await requestSampling(server, samplingRequest);
                
                return {
                    content: [{
                        type: "text",
                        text: String(aiResponse.content.text)
                    }]
                };
            } catch (error) {
                logger.error('Error in generatePR tool:', error);
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error generating PR: ${error instanceof Error ? error.message : String(error)}` }]
                };
            }
        }
    );

    logger.info("PR Generator tool registered successfully");
}