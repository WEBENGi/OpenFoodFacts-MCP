import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { 
  requestSampling, 
  createProductAnalysisRequest, 
  createProductComparisonRequest, 
  createRecipeSuggestionRequest 
} from "../sampling/sampling-service.js";

/**
 * Search product in Open Food Facts database
 */
async function searchProduct(barcode: string) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch product data: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`Error fetching product data:`, error);
    throw new Error(`Failed to fetch product data: ${error.message}`);
  }
}

/**
 * Register AI analysis tools with the MCP server
 */
export function registerAIAnalysisTools(server: McpServer) {
  // Register the product analysis tool
  server.tool(
    "analyzeProduct",
    {
      barcode: z.string().describe("The product barcode (EAN, UPC, etc.)")
    },
    async ({ barcode }: { barcode: string }) => {
      try {
        // Fetch product data
        const productData = await searchProduct(barcode);
        
        if (!productData.product) {
          return {
            isError: true,
            content: [
              { type: "text", text: `Product with barcode ${barcode} not found` }
            ]
          };
        }
        
        // Create sampling request for AI analysis
        const samplingRequest = createProductAnalysisRequest(productData.product);
        
        // Request LLM completion through the client
        const response = await requestSampling(server, samplingRequest);
        
        return {
          content: [
            { 
              type: "text", 
              text: `Analysis of ${productData.product.product_name || "Unknown Product"} (${barcode}):\n\n${response.content.text || "No analysis available"}` 
            }
          ]
        };
      } catch (error) {
        console.error("Error in analyzeProduct tool:", error);
        return {
          isError: true,
          content: [
            { 
              type: "text", 
              text: `Failed to analyze product: ${error instanceof Error ? error.message : String(error)}` 
            }
          ]
        };
      }
    }
  );
  
  // Register the product comparison tool
  server.tool(
    "compareProducts",
    {
      barcode1: z.string().describe("The first product barcode (EAN, UPC, etc.)"),
      barcode2: z.string().describe("The second product barcode (EAN, UPC, etc.)")
    },
    async ({ barcode1, barcode2 }: { barcode1: string, barcode2: string }) => {
      try {
        // Fetch both products
        const [product1Data, product2Data] = await Promise.all([
          searchProduct(barcode1),
          searchProduct(barcode2)
        ]);
        
        if (!product1Data.product) {
          return {
            isError: true,
            content: [
              { type: "text", text: `Product with barcode ${barcode1} not found` }
            ]
          };
        }
        
        if (!product2Data.product) {
          return {
            isError: true,
            content: [
              { type: "text", text: `Product with barcode ${barcode2} not found` }
            ]
          };
        }
        
        // Create sampling request for comparison
        const samplingRequest = createProductComparisonRequest(
          product1Data.product, 
          product2Data.product
        );
        
        // Request LLM completion through the client
        const response = await requestSampling(server, samplingRequest);
        
        return {
          content: [
            { 
              type: "text", 
              text: `Comparison of ${product1Data.product.product_name || "Unknown Product 1"} vs ${product2Data.product.product_name || "Unknown Product 2"}:\n\n${response.content.text || "No comparison available"}` 
            }
          ]
        };
      } catch (error) {
        console.error("Error in compareProducts tool:", error);
        return {
          isError: true,
          content: [
            { 
              type: "text", 
              text: `Failed to compare products: ${error instanceof Error ? error.message : String(error)}` 
            }
          ]
        };
      }
    }
  );
  
  // Register the recipe suggestion tool
  server.tool(
    "suggestRecipes",
    {
      barcode: z.string().describe("The product barcode (EAN, UPC, etc.)")
    },
    async ({ barcode }: { barcode: string }) => {
      try {
        // Fetch product data
        const productData = await searchProduct(barcode);
        
        if (!productData.product) {
          return {
            isError: true,
            content: [
              { type: "text", text: `Product with barcode ${barcode} not found` }
            ]
          };
        }
        
        // Create sampling request for recipe suggestions
        const samplingRequest = createRecipeSuggestionRequest(productData.product);
        
        // Request LLM completion through the client
        const response = await requestSampling(server, samplingRequest);
        
        return {
          content: [
            { 
              type: "text", 
              text: `Recipe suggestions using ${productData.product.product_name || "Unknown Product"} (${barcode}):\n\n${response.content.text || "No recipe suggestions available"}` 
            }
          ]
        };
      } catch (error) {
        console.error("Error in suggestRecipes tool:", error);
        return {
          isError: true,
          content: [
            { 
              type: "text", 
              text: `Failed to suggest recipes: ${error instanceof Error ? error.message : String(error)}` 
            }
          ]
        };
      }
    }
  );
}
