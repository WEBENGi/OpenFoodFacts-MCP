import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../transport/transports.js";
import { requestSampling } from "../sampling/sampling-service.js";
import path from 'path';
import { z } from "zod";
import {
    analyzeRepoStructure,
    findImportantFiles,
    estimateRepoLanguages,
    getDependencyInfo,
    generateCodebaseExplanation,
    searchInRepo,
    readFileWithContext,
    formatBytes,
    RepoStructureEntry,
    FileWithContext,
} from "./codebase-navigator.js";

/**
 * Registers the Codebase Navigator tools with the MCP server
 * @param server The MCP server instance to register the tools with
 */
export function registerCodebaseNavigatorTools(server: McpServer) {
    // Register the tool to analyze repository structure
    server.tool(
        "analyzeRepository",
        {
            repoUrl: z.string().optional().describe("URL to the Git repository to analyze (GitHub, GitLab, etc.)"),
            localPath: z.string().optional().describe("Local path to the repository if already cloned"),
            maxDepth: z.number().default(2).describe("Maximum directory depth to analyze")
        },
        async ({ localPath, repoUrl, maxDepth = 2 }) => {
            try {
                // Either localPath or repoUrl must be provided
                if (!localPath && !repoUrl) {
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: "Please provide either a local path or a repository URL to analyze."
                            }
                        ]
                    };
                }

                // If only repoUrl is provided, we would need to clone it first
                // For now, we'll just require localPath and add cloning capability later
                if (!localPath) {
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: "Repository URL support is coming soon. For now, please provide a local path to an already cloned repository."
                            }
                        ]
                    };
                }

                // Start analysis
                const repoStructure = await analyzeRepoStructure(localPath, maxDepth);
                const importantFiles = await findImportantFiles(localPath);
                const languageUsage = await estimateRepoLanguages(localPath);
                const dependencies = await getDependencyInfo(localPath);

                // Generate human-readable summary with AI
                const explanation = await generateCodebaseExplanation(
                    localPath,
                    repoStructure,
                    importantFiles,
                    languageUsage,
                    dependencies
                );

                // Count files and directories
                let totalFiles = 0;
                let totalDirs = 0;
                let totalSize = 0;

                function countItems(entry: RepoStructureEntry) {
                    if (entry.type === 'directory') {
                        totalDirs++;
                        if (entry.children) {
                            entry.children.forEach(countItems);
                        }
                    } else {
                        totalFiles++;
                        if (entry.size) {
                            totalSize += entry.size;
                        }
                    }
                }

                countItems(repoStructure);

                // Create summary text
                const topLanguages = Object.entries(languageUsage)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([lang, lines]) => `${lang}: ${lines} lines`);

                const totalSizeFormatted = formatBytes(totalSize);

                // Format response with rich information
                const responseParts = [
                    `# Repository Analysis: ${localPath.split('/').pop()}`,
                    "",
                    "## Overview",
                    explanation.overview,
                    "",
                    "## Repository Statistics",
                    `- Total Files: ${totalFiles}`,
                    `- Total Directories: ${totalDirs}`,
                    `- Total Size: ${totalSizeFormatted}`,
                    `- Top Languages: ${topLanguages.join(', ')}`,
                    "",
                    "## Key Components",
                    ...explanation.keyComponents.map(component => `- ${component}`),
                    "",
                    "## Architecture",
                    explanation.architectureDescription,
                    "",
                    "## Entry Points",
                    ...explanation.entryPoints.map(entry => `- ${entry}`),
                    "",
                    "## Data Flow",
                    explanation.dataFlow,
                    "",
                    "## Technologies Used",
                    ...explanation.technologiesUsed.map(tech => `- ${tech}`),
                    "",
                    "## Getting Started",
                    explanation.gettingStarted,
                    "",
                    "## Recommended Reading",
                    ...explanation.recommendedReading.map(file => `- ${file}`),
                    "",
                    `*This analysis was performed on ${new Date().toISOString().split('T')[0]} and represents a snapshot of the repository structure.*`
                ];

                return {
                    content: [
                        {
                            type: "text",
                            text: responseParts.join('\n')
                        }
                    ]
                };
            } catch (error) {
                logger.error('Error in analyzeRepository tool:', error);
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Error analyzing repository: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ]
                };
            }
        }
    );

    // Register the tool to explain code
    server.tool(
        "explainCode",
        {
            filePath: z.string().describe("Path to the file or directory to explain"),
            repoPath: z.string().optional().describe("Path to the repository root (optional, will be detected if not provided)"),
            includeDependencies: z.boolean().default(true).describe("Whether to include dependency analysis in the explanation"),
            includeContext: z.boolean().default(true).describe("Whether to include surrounding context like related files")
        },
        async ({ filePath, repoPath, includeDependencies = true, includeContext = true }) => {
            try {
                if (!filePath) {
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: "Please provide a path to the file or directory to explain."
                            }
                        ]
                    };
                }

                // Determine repository root if not provided
                const actualRepoPath = repoPath || path.dirname(filePath);

                // Read the file content
                let fileContext: FileWithContext;
                try {
                    fileContext = await readFileWithContext(actualRepoPath, filePath);
                } catch (error) {
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: `Error reading file: ${filePath}. ${error instanceof Error ? error.message : String(error)}`
                            }
                        ]
                    };
                }

                // Create a sampling request to explain the code using AI
                const systemPrompt =
                    "You are an expert software developer helping a newcomer understand code. " +
                    "Explain the provided code in a comprehensive but approachable way. " +
                    "Focus on the overall purpose, architecture, and how it fits into the larger system. " +
                    "Break down complex functions, explain key algorithms, and highlight important patterns. " +
                    "Use a teaching style that's suitable for beginners but doesn't oversimplify.";

                const samplingRequest = {
                    messages: [
                        {
                            role: "user" as const,
                            content: {
                                type: "text" as const,
                                text: `Explain this code file in detail, focusing on helping a newcomer understand it:

\`\`\`${fileContext.language || 'text'}
${fileContext.content}
\`\`\`
                
Please explain:
1. What does this code do? (overall purpose)
2. What are the key functions, classes, or structures?
3. How does this fit into the larger system?
4. What design patterns or architectural principles are used?
5. What are potential areas that might be confusing to newcomers?
6. How would someone extend or modify this code?`
                            }
                        }
                    ],
                    modelPreferences: {
                        hints: [
                            { name: "claude-3-opus" },
                            { name: "gpt-4" }
                        ],
                        intelligencePriority: 0.9,
                        speedPriority: 0.3,
                        costPriority: 0.3
                    },
                    systemPrompt,
                    includeContext: "thisServer" as const,
                    temperature: 0.1,
                    maxTokens: 4000
                };

                try {
                    // Request LLM completion through the client
                    const aiResponse = await requestSampling(server, samplingRequest);

                    // Include related files if context was requested
                    let relatedFilesContent = "";
                    if (includeContext) {
                        // Search for related patterns to find associated files
                        const fileName = path.basename(filePath, path.extname(filePath));
                        const relatedFiles = await searchInRepo(actualRepoPath, fileName);

                        if (relatedFiles.length > 0) {
                            relatedFilesContent = `\n\n## Related Files\nThe following files might be related to this code:\n\n`;
                            relatedFilesContent += relatedFiles
                                .filter(file => file !== filePath) // Exclude the current file
                                .slice(0, 5) // Limit to 5 related files
                                .map(file => `- \`${file}\``)
                                .join('\n');
                        }
                    }

                    // Include dependency information if requested
                    let dependenciesContent = "";
                    if (includeDependencies) {
                        const dependencies = await getDependencyInfo(actualRepoPath);

                        if (Object.keys(dependencies).length > 0) {
                            dependenciesContent = `\n\n## Dependencies\nThis code relies on the following technologies and dependencies:\n\n`;

                            if (dependencies.nodejs) {
                                dependenciesContent += "### Node.js Dependencies\n";
                                const nodeDeps = Object.entries(dependencies.nodejs.dependencies || {})
                                    .map(([name, version]) => `- \`${name}\`: ${version}`)
                                    .join('\n');
                                dependenciesContent += nodeDeps || "No production dependencies found.";
                            }

                            if (dependencies.python) {
                                dependenciesContent += "\n\n### Python Dependencies\n";
                                const pyDeps: string = dependencies.python.requirements
                                    .map((req: string) => `- \`${req}\``)
                                    .join('\n');
                                dependenciesContent += pyDeps || "No Python dependencies found.";
                            }
                        }
                    }

                    return {
                        content: [
                            {
                                type: "text",
                                text: `# Code Explanation: ${path.basename(filePath)}\n\n${aiResponse.content.text}${relatedFilesContent}${dependenciesContent}`
                            }
                        ]
                    };
                } catch (error) {
                    logger.error("Error generating code explanation:", error);
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: `Failed to generate explanation for ${filePath}: ${error instanceof Error ? error.message : String(error)}`
                            }
                        ]
                    };
                }
            } catch (error) {
                logger.error('Error in explainCode tool:', error);
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Error explaining code: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ]
                };
            }
        }
    );

    logger.info("Codebase Navigator tools registered successfully");
}