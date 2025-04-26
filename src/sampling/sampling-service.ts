import { CreateMessageResult } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";


export interface SamplingRequest {
  messages: Array<{
    role: "user" | "assistant";
    content: {
      type: "text" | "image";
      text?: string;
      data?: string;
      mimeType?: string;
    }
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

/**
 * Request a completion from an LLM via the connected client
 * 
 * @param mcpServer MCP server instance
 * @param request Sampling request parameters
 * @returns The LLM completion response
 */

const CreateMessageResultSchema = z.object({
    model: z.string(),
    stopReason: z.string().optional(),
    role: z.enum(["user", "assistant"]),
    content: z.object({
        type: z.enum(["text", "image"]),
        text: z.string().optional(),
        data: z.string().optional(),
        mimeType: z.string().optional(),
    }),
});

export async function requestSampling(
  mcpServer: McpServer,
  request: SamplingRequest
): Promise<CreateMessageResult> {
  try {
    // Access the underlying Server instance from McpServer
    const response = await mcpServer.server.request({
      method: "sampling/createMessage",
      params: {
        messages: request.messages,
        modelPreferences: request.modelPreferences,
        systemPrompt: request.systemPrompt,
        includeContext: request.includeContext,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        stopSequences: request.stopSequences,
        metadata: request.metadata
      }
    }, CreateMessageResultSchema);
    
    return response as CreateMessageResult;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Sampling request failed: ${errorMessage}`);
  }
}

/**
 * Creates a completion request for analyzing a food product
 * 
 * @param productData JSON data about the food product
 * @returns Sampling request configuration
 */
export function createProductAnalysisRequest(productData: any): SamplingRequest {
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Analyze this food product data from Open Food Facts and provide nutritional insights:\n\n${JSON.stringify(productData, null, 2)}`
        }
      }
    ],
    modelPreferences: {
      hints: [
        { name: "claude-3" },
        { name: "gemini-2.0-flash" },
        { name: "gemini-2.0" },
        { name: "gemini-2.5-pro" },
        { name: "sonnet" },
        { name: "gpt-4.1" },
        { name: "gpt-4o" }
      ],
      intelligencePriority: 0.8,
      speedPriority: 0.5,
      costPriority: 0.3
    },
    systemPrompt: "You are a nutrition expert analyzing food product data. Provide detailed insights about the nutritional quality, ingredients, and potential health impacts of this product. Include information about allergens, additives, and nutrition scores where available.",
    includeContext: "thisServer",
    temperature: 0.2,
    maxTokens: 2000,
    stopSequences: ["[END]"]
  };
}

/**
 * Creates a completion request for comparing two food products
 * 
 * @param product1Data JSON data about the first food product
 * @param product2Data JSON data about the second food product
 * @returns Sampling request configuration
 */
export function createProductComparisonRequest(product1Data: any, product2Data: any): SamplingRequest {
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Compare these two food products and determine which one is healthier and why:\n\nProduct 1:\n${JSON.stringify(product1Data, null, 2)}\n\nProduct 2:\n${JSON.stringify(product2Data, null, 2)}`
        }
      }
    ],
    modelPreferences: {
      hints: [
        { name: "claude-3" },
        { name: "gemini-2.0-flash" },
        { name: "gemini-2.0" },
        { name: "gemini-2.5-pro" },
        { name: "sonnet" },
        { name: "gpt-4.1" },
        { name: "gpt-4o" }
      ],
      intelligencePriority: 0.9,
      speedPriority: 0.4,
      costPriority: 0.3
    },
    systemPrompt: "You are a nutrition expert comparing food products. Analyze the nutritional information, ingredients, and additives of both products. Provide a clear comparison and determine which product is healthier based on nutritional content, processing level, additives, and overall quality.",
    includeContext: "thisServer",
    temperature: 0.1,
    maxTokens: 3000,
    stopSequences: ["[END]"]
  };
}

/**
 * Creates a completion request for generating healthy recipe suggestions based on product
 * 
 * @param productData JSON data about the food product
 * @returns Sampling request configuration
 */
export function createRecipeSuggestionRequest(productData: any): SamplingRequest {
  // Extract key product properties for contextual recipe generation
  const productName = productData.product_name || "this product";
  const category = productData.categories || "food item";
  const ingredients = productData.ingredients_text || "";
  const nutriments = productData.nutriments || {};
  const allergens = productData.allergens || "";
  const brands = productData.brands || "";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Generate personalized recipe suggestions for ${productName} (${brands}) with varied cooking methods and health profiles. Consider its nutritional profile: Energy ${nutriments.energy_100g || "unknown"} kcal, Fat ${nutriments.fat_100g || "unknown"}g, Proteins ${nutriments.proteins_100g || "unknown"}g, Carbs ${nutriments.carbohydrates_100g || "unknown"}g.` +
                `\n\nProduct information:\nCategory: ${category}\nIngredients: ${ingredients}\nPotential allergens: ${allergens}`
        }
      }
    ],
    modelPreferences: {
      hints: [
        { name: "claude-3" },
        { name: "gemini-2.0-flash" },
        { name: "gemini-2.0" },
        { name: "gemini-2.5-pro" },
        { name: "sonnet" },
        { name: "gpt-4.1" },
        { name: "gpt-4o" }
      ],
      intelligencePriority: 0.8,
      speedPriority: 0.5,
      costPriority: 0.3
    },
    systemPrompt: `You are a creative culinary nutritionist specializing in personalized recipe development. Your task is to generate diverse recipe suggestions using the specified product.

    For the given product, create 4 unique recipe suggestions in these different categories:
    1. LOW-CALORIE OPTION: A light meal or snack focusing on weight management
    2. PROTEIN-RICH OPTION: A recipe maximizing protein content for fitness enthusiasts
    3. QUICK & EASY: A simple recipe requiring minimal preparation and cooking time
    4. FAMILY-FRIENDLY: A balanced meal appealing to adults and children
    
    For each recipe, provide:
    - Creative recipe name
    - Complete ingredient list with measurements
    - Brief preparation instructions
    - Approximate nutritional values per serving
    - A health benefit highlight
    
    Adapt recipes to work with the product's characteristics. Consider complementary ingredients that enhance its nutritional profile. If the product contains allergens, suggest alternatives where possible.
    
    Present your response in a clean, organized format with clear headings and sections.`,
    includeContext: "thisServer",
    temperature: 0.7,
    maxTokens: 3500,
    stopSequences: ["[END]"]
  };
}

/**
 * Creates a completion request for generating a roadmap from GitHub issues
 * 
 * @param issues Array of simplified GitHub issues
 * @param repo Repository name
 * @param timeframe Timeframe for the roadmap (short, medium, or long)
 * @param focusArea Optional focus area to filter issues by
 * @returns Sampling request configuration
 */
export function createGitHubRoadmapRequest(
  issues: Array<{
    number: number;
    title: string;
    labels: string[];
    created_at: string;
    updated_at: string;
    comments: number;
  }>, 
  repo: string, 
  timeframe: string,
  focusArea?: string
): SamplingRequest {
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Generate a prioritized ${timeframe}-term roadmap based on these open GitHub issues from the Open Food Facts ${repo} repository${focusArea ? ` focusing on ${focusArea}` : ''}:\n\n${JSON.stringify(issues, null, 2)}`
        }
      }
    ],
    modelPreferences: {
      hints: [
        { name: "claude-3" },
        { name: "gemini-2.0-flash" },
        { name: "gemini-2.0" },
        { name: "gemini-2.5-pro" },
        { name: "sonnet" },
        { name: "gpt-4.1" },
        { name: "gpt-4o" }
      ],
      intelligencePriority: 0.9,
      speedPriority: 0.3,
      costPriority: 0.4
    },
    systemPrompt: `You are a product manager and technical lead for the Open Food Facts ${repo} repository. Create a prioritized ${timeframe}-term roadmap based on the provided GitHub issues. Include:\n\n1. EXECUTIVE SUMMARY: Brief overview of key priorities\n2. PRIORITY ISSUES: List of issues to address first with justification\n3. IMPLEMENTATION TIMELINE: Suggested schedule broken down by weeks/months\n4. RESOURCE REQUIREMENTS: Estimated developer hours and specialties needed\n5. DEPENDENCIES: How issues relate and depend on each other\n6. SUCCESS METRICS: How to measure successful implementation\n7. RISKS AND MITIGATIONS: Potential challenges and how to address them`,
    includeContext: "thisServer" as const,
    temperature: 0.4,
    maxTokens: 3500,
    stopSequences: ["[END]"]
  };
}