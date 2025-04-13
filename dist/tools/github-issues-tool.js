import { z } from "zod";
import { requestSampling, createGitHubRoadmapRequest } from "../sampling/sampling-service.js";
/**
 * Fetch GitHub issues from the Open Food Facts organization
 * @param repo Repository name within the openfoodfacts organization
 * @param state Issue state (open, closed, all)
 * @param labels Comma-separated list of labels to filter by
 * @returns Array of GitHub issues
 */
async function fetchGitHubIssues(repo, state = "open", labels = "") {
    try {
        // Construct the GitHub API URL
        const baseUrl = "https://api.github.com/repos/openfoodfacts";
        const url = `${baseUrl}/${repo}/issues?state=${state}&per_page=100${labels ? `&labels=${labels}` : ""}`;
        const response = await fetch(url, {
            headers: {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "OpenFoodFacts-MCP-Server"
            }
        });
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`);
        }
        const issues = await response.json();
        return issues;
    }
    catch (error) {
        console.error(`Error fetching GitHub issues:`, error);
        throw new Error(`Failed to fetch GitHub issues: ${error.message}`);
    }
}
/**
 * Determine the issue type (bug, enhancement, feature, etc.) based on labels or content
 * @param issue GitHub issue data
 * @returns Issue type category
 */
function determineIssueType(issue) {
    // Check labels first
    if (issue.labels && Array.isArray(issue.labels)) {
        const labelNames = issue.labels.map((label) => label.name.toLowerCase());
        if (labelNames.some((name) => name.includes('bug') || name.includes('error') || name.includes('fix'))) {
            return 'bug';
        }
        if (labelNames.some((name) => name.includes('enhancement') || name.includes('improve'))) {
            return 'enhancement';
        }
        if (labelNames.some((name) => name.includes('feature') || name.includes('new'))) {
            return 'feature';
        }
    }
    // Check title as fallback
    const titleLower = issue.title.toLowerCase();
    if (titleLower.includes('bug') || titleLower.includes('fix') || titleLower.includes('error')) {
        return 'bug';
    }
    if (titleLower.includes('enhance') || titleLower.includes('improve')) {
        return 'enhancement';
    }
    if (titleLower.includes('feature') || titleLower.includes('add') || titleLower.startsWith('new')) {
        return 'feature';
    }
    // Default
    return 'general';
}
/**
 * Determine if the issue is primarily frontend or backend related
 * @param issue GitHub issue data
 * @returns Component type (frontend, backend, other)
 */
function determineComponentType(issue) {
    // Check labels first
    if (issue.labels && Array.isArray(issue.labels)) {
        const labelNames = issue.labels.map((label) => label.name.toLowerCase());
        if (labelNames.some((name) => name.includes('frontend') || name.includes('ui') || name.includes('app') || name.includes('mobile'))) {
            return 'frontend';
        }
        if (labelNames.some((name) => name.includes('backend') || name.includes('server') || name.includes('api') || name.includes('database'))) {
            return 'backend';
        }
    }
    // Check body content
    if (issue.body) {
        const bodyLower = issue.body.toLowerCase();
        // Frontend indicators
        if (bodyLower.includes('javascript') || bodyLower.includes('css') || bodyLower.includes('html') ||
            bodyLower.includes('react') || bodyLower.includes('vue') || bodyLower.includes('angular') ||
            bodyLower.includes('ui') || bodyLower.includes('user interface') || bodyLower.includes('mobile app')) {
            return 'frontend';
        }
        // Backend indicators
        if (bodyLower.includes('server') || bodyLower.includes('database') || bodyLower.includes('api') ||
            bodyLower.includes('perl') || bodyLower.includes('mongodb') || bodyLower.includes('endpoint')) {
            return 'backend';
        }
    }
    return 'other';
}
/**
 * Create a specialized system prompt based on issue type and component
 * @param issueType Issue type (bug, enhancement, feature, general)
 * @param componentType Component type (frontend, backend, other)
 * @returns Specialized system prompt
 */
function createSpecializedPrompt(issueType, componentType) {
    // Base prompt sections that all prompts will include
    const basePromptSections = [
        "ISSUE SUMMARY: Brief summary of the issue",
        "TESTING STRATEGY: How to test the solution",
        "POTENTIAL CHALLENGES: Any obstacles or considerations"
    ];
    // Specialized prompts by issue type
    if (issueType === 'bug') {
        const bugSections = [
            "ROOT CAUSES: Identify the likely cause of this bug with evidence from the issue description",
            "REPRODUCTION STEPS: Clear steps to reproduce the problem",
            "IMPACT ASSESSMENT: How this bug affects users and system reliability",
            "BUG FIX APPROACH: Targeted solution focused on fixing the specific defect",
            "VERIFICATION PROCESS: How to verify the bug is actually fixed"
        ];
        // Further specialize by component type
        if (componentType === 'frontend') {
            return `You are an expert frontend developer specializing in the Open Food Facts ecosystem. Analyze this bug issue and provide detailed recommendations with these sections:\n\n${[...basePromptSections, ...bugSections, "BROWSER COMPATIBILITY: Any browser-specific concerns", "UI/UX CONSIDERATIONS: How the fix should maintain design consistency"].join("\n")}`;
        }
        else if (componentType === 'backend') {
            return `You are an expert backend developer specializing in the Open Food Facts ecosystem. Analyze this bug issue and provide detailed recommendations with these sections:\n\n${[...basePromptSections, ...bugSections, "DATA INTEGRITY: How this bug affects data quality", "PERFORMANCE IMPLICATIONS: Any performance concerns with the fix"].join("\n")}`;
        }
        else {
            return `You are an expert software developer specializing in the Open Food Facts ecosystem. Analyze this bug issue and provide detailed recommendations with these sections:\n\n${[...basePromptSections, ...bugSections].join("\n")}`;
        }
    }
    else if (issueType === 'enhancement') {
        const enhancementSections = [
            "CURRENT LIMITATIONS: What's currently limiting the functionality",
            "IMPROVEMENT OPPORTUNITIES: Specific areas that can be enhanced",
            "IMPLEMENTATION APPROACHES: Several possible approaches to implement the enhancement",
            "RECOMMENDED APPROACH: The best approach with justification and trade-offs",
            "IMPLEMENTATION STEPS: Step-by-step guide to implement the enhancement"
        ];
        if (componentType === 'frontend') {
            return `You are an expert frontend developer specializing in the Open Food Facts ecosystem. Analyze this enhancement issue and provide detailed recommendations with these sections:\n\n${[...basePromptSections, ...enhancementSections, "UI/UX IMPROVEMENTS: How this enhances user experience", "ACCESSIBILITY CONSIDERATIONS: How to ensure the enhancement is accessible"].join("\n")}`;
        }
        else if (componentType === 'backend') {
            return `You are an expert backend developer specializing in the Open Food Facts ecosystem. Analyze this enhancement issue and provide detailed recommendations with these sections:\n\n${[...basePromptSections, ...enhancementSections, "API DESIGN PRINCIPLES: How this fits into the API architecture", "SCALABILITY CONSIDERATIONS: How this enhancement scales"].join("\n")}`;
        }
        else {
            return `You are an expert software developer specializing in the Open Food Facts ecosystem. Analyze this enhancement issue and provide detailed recommendations with these sections:\n\n${[...basePromptSections, ...enhancementSections].join("\n")}`;
        }
    }
    else if (issueType === 'feature') {
        const featureSections = [
            "USER VALUE: Why this feature matters to users",
            "FEATURE SCOPE: Clear definition of what's in and out of scope",
            "DESIGN CONSIDERATIONS: Key design decisions for implementing this feature",
            "ARCHITECTURE IMPLICATIONS: How this feature fits into the overall system",
            "IMPLEMENTATION PLAN: Comprehensive plan with technical requirements",
            "CODE EXAMPLES: Pseudo-code or actual code examples where appropriate"
        ];
        if (componentType === 'frontend') {
            return `You are an expert frontend developer specializing in the Open Food Facts ecosystem. Analyze this feature request and provide detailed recommendations with these sections:\n\n${[...basePromptSections, ...featureSections, "UI/UX DESIGN: Wireframes or description of the user interface", "FRONTEND TECHNOLOGIES: Recommended technologies for implementation"].join("\n")}`;
        }
        else if (componentType === 'backend') {
            return `You are an expert backend developer specializing in the Open Food Facts ecosystem. Analyze this feature request and provide detailed recommendations with these sections:\n\n${[...basePromptSections, ...featureSections, "DATA MODELING: How data should be structured for this feature", "API DESIGN: Required API endpoints and their specifications"].join("\n")}`;
        }
        else {
            return `You are an expert software developer specializing in the Open Food Facts ecosystem. Analyze this feature request and provide detailed recommendations with these sections:\n\n${[...basePromptSections, ...featureSections].join("\n")}`;
        }
    }
    else {
        // General default prompt
        return "You are an expert software developer and open source contributor specializing in the Open Food Facts ecosystem. Analyze the provided GitHub issue and provide detailed recommendations with these sections:\n\n1. ISSUE SUMMARY: Brief summary of the issue\n2. ROOT CAUSES: Identify potential underlying causes\n3. SOLUTION APPROACHES: Several possible implementation approaches\n4. RECOMMENDED SOLUTION: The best approach with justification\n5. IMPLEMENTATION STEPS: Detailed steps to implement the solution\n6. CODE EXAMPLES: Pseudo-code or actual code examples where appropriate\n7. TESTING STRATEGY: How to test the solution\n8. POTENTIAL CHALLENGES: Any obstacles or considerations";
    }
}
/**
 * Create a sampling request for analyzing a GitHub issue with specialized prompts
 * @param issue GitHub issue data
 * @returns Sampling request configuration
 */
function createIssueAnalysisRequest(issue, orgRepoContext) {
    // Determine issue and component type
    const issueType = determineIssueType(issue);
    const componentType = determineComponentType(issue);
    // Get specialized prompt
    const systemPrompt = createSpecializedPrompt(issueType, componentType);
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Analyze this GitHub issue from the Open Food Facts ${orgRepoContext} repository and provide detailed recommendations:\n\n${JSON.stringify(issue, null, 2)}`
                }
            }
        ],
        modelPreferences: {
            hints: [
                { name: "claude-3" },
                { name: "gpt-4" }
            ],
            intelligencePriority: 0.9,
            speedPriority: 0.5,
            costPriority: 0.3
        },
        systemPrompt,
        includeContext: "thisServer",
        temperature: 0.2,
        maxTokens: 2000,
        stopSequences: ["[END]"]
    };
}
/**
 * Create specialized pattern analysis prompt based on issue labels and focus
 * @param label Label used to filter issues
 * @returns Specialized pattern analysis prompt
 */
function createSpecializedPatternPrompt(label) {
    const labelLower = label.toLowerCase();
    // Base sections all pattern analysis will include
    const baseSections = [
        "COMMON THEMES: Identify recurring issues or themes",
        "PRIORITY RECOMMENDATIONS: Which issues should be addressed first and why",
        "RESOURCE ALLOCATION: How to allocate developer resources efficiently"
    ];
    if (labelLower.includes('bug') || labelLower.includes('error') || labelLower.includes('fix')) {
        const bugSections = [
            "BUG PATTERNS: Identify recurring bug patterns across issues",
            "ROOT CAUSE ANALYSIS: Common underlying causes for these bugs",
            "PREVENTION STRATEGIES: How to prevent similar bugs in the future",
            "TECHNICAL DEBT: Areas where code quality might be causing bugs",
            "QUALITY ASSURANCE: Recommendations for improving QA processes"
        ];
        return `You are an expert software quality analyst specializing in the Open Food Facts ecosystem. Analyze these bug-related GitHub issues and identify patterns and systemic improvements with these sections:\n\n${[...baseSections, ...bugSections].join("\n")}`;
    }
    if (labelLower.includes('enhancement') || labelLower.includes('improve')) {
        const enhancementSections = [
            "ENHANCEMENT PATTERNS: Common areas targeted for improvement",
            "USER EXPERIENCE: How these enhancements collectively impact UX",
            "TECHNICAL MODERNIZATION: Opportunities for technical upgrades",
            "IMPLEMENTATION STRATEGY: How to approach these enhancements holistically",
            "PRIORITIZATION FRAMEWORK: Criteria for selecting which enhancements to implement first"
        ];
        return `You are an expert software architect specializing in the Open Food Facts ecosystem. Analyze these enhancement-related GitHub issues and identify patterns and systemic improvements with these sections:\n\n${[...baseSections, ...enhancementSections].join("\n")}`;
    }
    if (labelLower.includes('feature') || labelLower.includes('new')) {
        const featureSections = [
            "FEATURE VISION: How these features collectively shape the product",
            "STRATEGIC ALIGNMENT: How features align with project goals",
            "IMPLEMENTATION COMPLEXITY: Assessment of development complexity",
            "FEATURE DEPENDENCIES: How features relate to and depend on each other",
            "ROADMAP PLANNING: Suggested sequence for feature implementation"
        ];
        return `You are an expert product manager specializing in the Open Food Facts ecosystem. Analyze these feature-related GitHub issues and identify patterns and systemic improvements with these sections:\n\n${[...baseSections, ...featureSections].join("\n")}`;
    }
    if (labelLower.includes('frontend') || labelLower.includes('ui') || labelLower.includes('mobile')) {
        const frontendSections = [
            "UI/UX PATTERNS: Recurring user interface concerns",
            "FRONTEND ARCHITECTURE: Systemic improvement opportunities",
            "DESIGN SYSTEM: Recommendations for UI consistency",
            "FRONTEND PERFORMANCE: Performance optimization opportunities",
            "CROSS-PLATFORM CONSIDERATIONS: Issues affecting multiple platforms"
        ];
        return `You are an expert frontend developer specializing in the Open Food Facts ecosystem. Analyze these frontend-related GitHub issues and identify patterns and systemic improvements with these sections:\n\n${[...baseSections, ...frontendSections].join("\n")}`;
    }
    if (labelLower.includes('backend') || labelLower.includes('api') || labelLower.includes('server')) {
        const backendSections = [
            "API DESIGN PATTERNS: Recurring API design concerns",
            "DATABASE OPTIMIZATIONS: Data storage and retrieval improvements",
            "SCALABILITY CONCERNS: Issues affecting system scaling",
            "BACKEND ARCHITECTURE: Architectural improvement opportunities",
            "PERFORMANCE BOTTLENECKS: Areas of backend performance concern"
        ];
        return `You are an expert backend developer specializing in the Open Food Facts ecosystem. Analyze these backend-related GitHub issues and identify patterns and systemic improvements with these sections:\n\n${[...baseSections, ...backendSections].join("\n")}`;
    }
    // Default pattern analysis prompt
    return "You are an expert software developer and open source contributor specializing in the Open Food Facts ecosystem. Analyze the provided GitHub issues and identify patterns and systemic improvements with these sections:\n\n1. COMMON THEMES: Identify recurring issues or themes\n2. SYSTEMIC PROBLEMS: Potential underlying architectural or process issues\n3. PRIORITY RECOMMENDATIONS: Which issues should be addressed first and why\n4. LONG-TERM IMPROVEMENTS: Strategic changes to reduce similar issues\n5. SUGGESTED PROCESS CHANGES: How the development process might be improved\n6. RESOURCE ALLOCATION: How to allocate developer resources efficiently";
}
/**
 * Create a sampling request for analyzing multiple GitHub issues to identify patterns
 * @param issues Array of GitHub issue data
 * @returns Sampling request configuration
 */
function createIssuesPatternAnalysisRequest(issues, orgRepoContext, label = "") {
    // Extract essential data to avoid token limit issues
    const simplifiedIssues = issues.map(issue => ({
        number: issue.number,
        title: issue.title,
        labels: issue.labels.map((l) => l.name),
        created_at: issue.created_at,
        body: issue.body?.substring(0, 500) + (issue.body?.length > 500 ? "..." : ""),
        comments: issue.comments
    }));
    // Get specialized pattern analysis prompt based on label
    const systemPrompt = createSpecializedPatternPrompt(label);
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Analyze these GitHub issues from the Open Food Facts ${orgRepoContext} repository and identify patterns and systemic improvements:\n\n${JSON.stringify(simplifiedIssues, null, 2)}`
                }
            }
        ],
        modelPreferences: {
            hints: [
                { name: "claude-3" },
                { name: "gpt-4" }
            ],
            intelligencePriority: 0.9,
            speedPriority: 0.4,
            costPriority: 0.3
        },
        systemPrompt,
        includeContext: "thisServer",
        temperature: 0.3,
        maxTokens: 2000,
        stopSequences: ["[END]"]
    };
}
/**
 * Register GitHub issues analysis tools with the MCP server
 */
export function registerGitHubIssuesTools(server) {
    // Register the tool to analyze a single GitHub issue
    server.tool("analyzeGitHubIssue", {
        repo: z.string().describe("The repository name within the openfoodfacts organization"),
        issueNumber: z.number().describe("The GitHub issue number to analyze")
    }, async ({ repo, issueNumber }) => {
        try {
            // Fetch the specific issue by constructing the URL directly
            const baseUrl = "https://api.github.com/repos/openfoodfacts";
            const url = `${baseUrl}/${repo}/issues/${issueNumber}`;
            const response = await fetch(url, {
                headers: {
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "OpenFoodFacts-MCP-Server"
                }
            });
            if (!response.ok) {
                return {
                    isError: true,
                    content: [
                        { type: "text", text: `GitHub issue #${issueNumber} not found or API error: ${response.status}` }
                    ]
                };
            }
            const issue = await response.json();
            // Create sampling request for AI analysis with specialized prompt
            const samplingRequest = createIssueAnalysisRequest(issue, `${repo}`);
            // Request LLM completion through the client
            const response2 = await requestSampling(server, samplingRequest);
            return {
                content: [
                    {
                        type: "text",
                        text: `Analysis of GitHub Issue #${issueNumber} - ${issue.title}:\n\n${response2.content.text || "No analysis available"}`
                    }
                ]
            };
        }
        catch (error) {
            console.error("Error in analyzeGitHubIssue tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Failed to analyze GitHub issue: ${error instanceof Error ? error.message : String(error)}`
                    }
                ]
            };
        }
    });
    // Register the tool to analyze multiple GitHub issues by label
    server.tool("analyzeGitHubIssuesByLabel", {
        repo: z.string().describe("The repository name within the openfoodfacts organization"),
        label: z.string().describe("The label to filter issues by"),
        state: z.enum(["open", "closed", "all"]).default("open").describe("Filter issues by state"),
        limit: z.number().default(10).describe("Maximum number of issues to analyze")
    }, async ({ repo, label, state, limit }) => {
        try {
            // Fetch issues with the specific label
            const issues = await fetchGitHubIssues(repo, state, label);
            if (!issues || issues.length === 0) {
                return {
                    isError: true,
                    content: [
                        { type: "text", text: `No GitHub issues found with label '${label}' in state '${state}'` }
                    ]
                };
            }
            // Limit the number of issues to analyze
            const limitedIssues = issues.slice(0, limit);
            // Create sampling request for pattern analysis with specialized prompt
            const samplingRequest = createIssuesPatternAnalysisRequest(limitedIssues, `${repo}`, label);
            // Request LLM completion through the client
            const response = await requestSampling(server, samplingRequest);
            return {
                content: [
                    {
                        type: "text",
                        text: `Analysis of ${limitedIssues.length} GitHub Issues with label '${label}':\n\n${response.content.text || "No analysis available"}`
                    }
                ]
            };
        }
        catch (error) {
            console.error("Error in analyzeGitHubIssuesByLabel tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Failed to analyze GitHub issues: ${error instanceof Error ? error.message : String(error)}`
                    }
                ]
            };
        }
    });
    // Register the tool to recommend a prioritized roadmap based on open issues
    server.tool("createGitHubIssueRoadmap", {
        repo: z.string().describe("The repository name within the openfoodfacts organization"),
        timeframe: z.enum(["short", "medium", "long"]).default("medium").describe("Timeframe for the roadmap"),
        focusArea: z.string().optional().describe("Optional focus area (e.g., 'mobile', 'backend', 'ui')")
    }, async ({ repo, timeframe, focusArea }) => {
        try {
            // Fetch open issues
            let issues = await fetchGitHubIssues(repo, "open");
            if (!issues || issues.length === 0) {
                return {
                    isError: true,
                    content: [
                        { type: "text", text: `No open GitHub issues found in repository '${repo}'` }
                    ]
                };
            }
            // Filter by focus area if provided
            if (focusArea) {
                issues = issues.filter((issue) => {
                    // Check if focus area appears in title, body, or labels
                    const focusAreaLower = focusArea.toLowerCase();
                    const titleMatch = issue.title.toLowerCase().includes(focusAreaLower);
                    const bodyMatch = issue.body && issue.body.toLowerCase().includes(focusAreaLower);
                    const labelsMatch = issue.labels.some((l) => l.name.toLowerCase().includes(focusAreaLower));
                    return titleMatch || bodyMatch || labelsMatch;
                });
                if (issues.length === 0) {
                    return {
                        isError: true,
                        content: [
                            { type: "text", text: `No open GitHub issues found related to '${focusArea}'` }
                        ]
                    };
                }
            }
            // Limit to a reasonable number for analysis
            const limitedIssues = issues.slice(0, 30);
            // Prepare simplified issues array for the roadmap request
            const simplifiedIssues = limitedIssues.map((i) => ({
                number: i.number,
                title: i.title,
                labels: i.labels.map((l) => l.name),
                created_at: i.created_at,
                updated_at: i.updated_at,
                comments: i.comments
            }));
            // Use the dedicated sampling request function for roadmap generation
            const samplingRequest = createGitHubRoadmapRequest(simplifiedIssues, repo, timeframe, focusArea);
            // Request LLM completion through the client
            const response = await requestSampling(server, samplingRequest);
            return {
                content: [
                    {
                        type: "text",
                        text: `${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}-Term Roadmap for ${repo}${focusArea ? ` (${focusArea})` : ''}:\n\n${response.content.text || "No roadmap available"}`
                    }
                ]
            };
        }
        catch (error) {
            console.error("Error in createGitHubIssueRoadmap tool:", error);
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Failed to create GitHub issues roadmap: ${error instanceof Error ? error.message : String(error)}`
                    }
                ]
            };
        }
    });
}
