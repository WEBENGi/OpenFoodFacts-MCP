import { CreateMessageResult } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export interface SamplingRequest {
    messages: Array<{
        role: "user" | "assistant";
        content: {
            type: "text" | "image";
            text?: string;
            data?: string;
            mimeType?: string;
        };
    }>;
    modelPreferences?: {
        hints?: Array<{
            name?: string;
        }>;
        costPriority?: number;
        speedPriority?: number;
        intelligencePriority?: number;
    };
    systemPrompt?: string;
    includeContext?: "none" | "thisServer" | "allServers";
    temperature?: number;
    maxTokens: number;
    stopSequences?: string[];
    metadata?: Record<string, unknown>;
}
export declare function requestSampling(mcpServer: McpServer, request: SamplingRequest): Promise<CreateMessageResult>;
/**
 * Creates a completion request for analyzing a food product
 *
 * @param productData JSON data about the food product
 * @returns Sampling request configuration
 */
export declare function createProductAnalysisRequest(productData: any): SamplingRequest;
/**
 * Creates a completion request for comparing two food products
 *
 * @param product1Data JSON data about the first food product
 * @param product2Data JSON data about the second food product
 * @returns Sampling request configuration
 */
export declare function createProductComparisonRequest(product1Data: any, product2Data: any): SamplingRequest;
/**
 * Creates a completion request for generating healthy recipe suggestions based on product
 *
 * @param productData JSON data about the food product
 * @returns Sampling request configuration
 */
export declare function createRecipeSuggestionRequest(productData: any): SamplingRequest;
/**
 * Creates a completion request for generating a roadmap from GitHub issues
 *
 * @param issues Array of simplified GitHub issues
 * @param repo Repository name
 * @param timeframe Timeframe for the roadmap (short, medium, or long)
 * @param focusArea Optional focus area to filter issues by
 * @returns Sampling request configuration
 */
export declare function createGitHubRoadmapRequest(issues: Array<{
    number: number;
    title: string;
    labels: string[];
    created_at: string;
    updated_at: string;
    comments: number;
}>, repo: string, timeframe: string, focusArea?: string): SamplingRequest;
