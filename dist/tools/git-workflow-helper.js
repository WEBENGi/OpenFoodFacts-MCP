import { logger } from "../transport/transports.js";
import { requestSampling } from "../sampling/sampling-service.js";
import { z } from "zod";
import { findImportantFiles } from "./codebase-navigator.js";
/**
 * Registers the Git Workflow Helper tool with the MCP server
 * @param server The MCP server instance to register the tool with
 */
export function registerGitHelper(server) {
    server.tool("gitHelper", {
        repoPath: z.string().describe("Path to the repository root"),
        operation: z.enum(["branch", "rebase", "conflict", "sync"]).describe("Git operation needing assistance"),
        branchName: z.string().optional().describe("Name of the branch being worked with"),
        conflictFiles: z.array(z.string()).optional().describe("Files with conflicts")
    }, async ({ repoPath, operation, branchName, conflictFiles = [] }) => {
        try {
            if (!repoPath || !operation) {
                return {
                    isError: true,
                    content: [{ type: "text", text: "Please provide repository path and Git operation." }]
                };
            }
            // Get repository information
            const repoFiles = await findImportantFiles(repoPath);
            const hasGitflow = repoFiles.some(f => f.includes('.gitflow'));
            // Create AI prompt for Git guidance
            const systemPrompt = "You are an expert Git mentor helping contributors navigate complex Git workflows. " +
                "Provide clear, step-by-step instructions for Git operations, explaining what each step does " +
                "and how to handle potential issues.";
            const samplingRequest = {
                messages: [{
                        role: "user",
                        content: {
                            type: "text",
                            text: `Provide guidance for Git ${operation} operation:
Repository uses${hasGitflow ? '' : ' not'} GitFlow
${branchName ? `Working with branch: ${branchName}` : ''}
${conflictFiles.length > 0 ? `Conflicts in files:\n${conflictFiles.join('\n')}` : ''}

Please provide:
1. Step-by-step instructions
2. Explanation of each step
3. How to verify success
4. Common pitfalls to avoid
5. How to undo if something goes wrong`
                        }
                    }],
                modelPreferences: {
                    hints: [{ name: "claude-3" }, { name: "gpt-4" }],
                    intelligencePriority: 0.7,
                    speedPriority: 0.7
                },
                systemPrompt,
                includeContext: "thisServer",
                temperature: 0.2,
                maxTokens: 2000
            };
            const aiResponse = await requestSampling(server, samplingRequest);
            return {
                content: [{
                        type: "text",
                        text: `# Git ${operation.charAt(0).toUpperCase() + operation.slice(1)} Guide\n\n${aiResponse.content.text}`
                    }]
            };
        }
        catch (error) {
            logger.error('Error in gitHelper tool:', error);
            return {
                isError: true,
                content: [{ type: "text", text: `Error providing Git guidance: ${error instanceof Error ? error.message : String(error)}` }]
            };
        }
    });
    logger.info("Git Workflow Helper tool registered successfully");
}
