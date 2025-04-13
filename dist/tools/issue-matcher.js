import { logger } from "../transport/transports.js";
import { requestSampling } from "../sampling/sampling-service.js";
import { z } from "zod";
import { searchInRepo, findImportantFiles } from "./codebase-navigator.js";
/**
 * Registers the Issue Matcher tool with the MCP server
 * @param server The MCP server instance to register the tool with
 */
export function registerIssueMatcher(server) {
    server.tool("matchIssues", {
        repoPath: z.string().describe("Path to the repository root"),
        skillLevel: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
        languages: z.array(z.string()).optional().describe("Programming languages the user is familiar with"),
        interests: z.array(z.string()).optional().describe("Areas of interest (e.g., 'frontend', 'docs', 'testing')"),
        maxIssues: z.number().default(5).describe("Maximum number of issues to return")
    }, async ({ repoPath, skillLevel = "beginner", languages = [], interests = [], maxIssues = 5 }) => {
        try {
            if (!repoPath) {
                return {
                    isError: true,
                    content: [{ type: "text", text: "Please provide a repository path." }]
                };
            }
            // Get repository issues from GitHub API or local cache
            const issues = await searchInRepo(repoPath, "good first issue");
            const issueFiles = await findImportantFiles(repoPath);
            // Create AI prompt to match issues with user profile
            const systemPrompt = "You are an experienced open source mentor helping match contributors with appropriate issues. " +
                "Consider the contributor's skill level, interests, and programming language experience " +
                "to suggest the most suitable issues for them to work on.";
            const samplingRequest = {
                messages: [{
                        role: "user",
                        content: {
                            type: "text",
                            text: `Find the best matching issues for a contributor with:
- Skill level: ${skillLevel}
- Languages: ${languages.join(', ') || 'Not specified'}
- Interests: ${interests.join(', ') || 'Not specified'}

Available issues and related files:
${issues.map(issue => `- ${issue}`).join('\n')}

Please suggest up to ${maxIssues} issues that would be good matches, explaining why each would be appropriate for this contributor.`
                        }
                    }],
                modelPreferences: {
                    hints: [{ name: "claude-3" }, { name: "gpt-4" }],
                    intelligencePriority: 0.8,
                    speedPriority: 0.6
                },
                systemPrompt,
                includeContext: "thisServer",
                temperature: 0.3,
                maxTokens: 2000
            };
            const aiResponse = await requestSampling(server, samplingRequest);
            return {
                content: [{
                        type: "text",
                        text: `# Suggested Issues for Your Skills\n\n${aiResponse.content.text}`
                    }]
            };
        }
        catch (error) {
            logger.error('Error in matchIssues tool:', error);
            return {
                isError: true,
                content: [{ type: "text", text: `Error matching issues: ${error instanceof Error ? error.message : String(error)}` }]
            };
        }
    });
    logger.info("Issue Matcher tool registered successfully");
}
