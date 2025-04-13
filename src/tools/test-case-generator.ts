import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../transport/transports.js";
import { requestSampling } from "../sampling/sampling-service.js";
import { z } from "zod";
import { readFileWithContext } from "./codebase-navigator.js";

/**
 * Registers the Test Case Generator tool with the MCP server
 * @param server The MCP server instance to register the tool with
 */
export function registerTestGenerator(server: McpServer) {
    server.tool(
        "generateTests",
        {
            repoPath: z.string().describe("Path to the repository root"),
            filePath: z.string().describe("Path to the file needing tests"),
            testFramework: z.enum(["jest", "mocha", "pytest", "unittest"]).default("jest"),
        },
        async ({ repoPath, filePath, testFramework = "jest" }) => {
            try {
                if (!repoPath || !filePath) {
                    return {
                        isError: true,
                        content: [{ type: "text", text: "Please provide repository path and file path." }]
                    };
                }

                // Read the source file
                const fileContent = await readFileWithContext(repoPath, filePath);
                
                // Create AI prompt to generate test cases
                const systemPrompt = 
                    "You are an expert in test-driven development, helping to create comprehensive test cases. " +
                    "Based on the source code, generate appropriate test cases that cover the main functionality, " +
                    "edge cases, and error conditions.";

                const samplingRequest = {
                    messages: [{
                        role: "user" as const,
                        content: {
                            type: "text" as const,
                            text: `Generate test cases for this code using ${testFramework}:

                            ${fileContent.content}

                            Please include tests for:
                            1. Main functionality
                            2. Edge cases
                            3. Error handling
                            4. Any complex logic or algorithms`
                        }
                    }],
                    modelPreferences: {
                        hints: [{ name: "claude-3" }, { name: "gpt-4" }],
                        intelligencePriority: 0.9,
                        speedPriority: 0.3
                    },
                    systemPrompt,
                    includeContext: "thisServer" as const,
                    temperature: 0.2,
                    maxTokens: 3000
                };

                const aiResponse = await requestSampling(server, samplingRequest);
                
                return {
                    content: [{
                        type: "text",
                        text: `# Generated Test Cases\n\n${aiResponse.content.text}`
                    }]
                };
            } catch (error) {
                logger.error('Error in generateTests tool:', error);
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error generating tests: ${error instanceof Error ? error.message : String(error)}` }]
                };
            }
        }
    );

    logger.info("Test Case Generator tool registered successfully");
}