import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { searchProducts, getProductByBarcode } from "./product-search.js";
import { registerAIAnalysisTools } from "./ai-analysis-tool.js";
import { registerGitHubIssuesTools } from "./github-issues-tool.js";
import { requestSampling, createRecipeSuggestionRequest } from "../sampling/sampling-service.js";
import { logger } from '../transport/transports.js';

// Track all tools registered via server.tool()
// This will hold tool definitions from Set 2 tools
const registeredTools = new Map();

// Create a wrapper around the original server.tool method to track all registered tools
function wrapMcpServerTool(server: McpServer) {
  // Store the original tool method
  const originalToolMethod = server.tool.bind(server);

  // Replace it with our wrapped version that matches the correct signature
  // The correct signature appears to expect a callback function as the second parameter
  server.tool = function(name: string, schemaOrCallback: any, handlerOrUndefined?: any) {
    let schema, handler;
    
    // Check if we're getting the schema+handler pattern or just name+callback pattern
    if (typeof schemaOrCallback === 'function' && handlerOrUndefined === undefined) {
      // This is the name+callback signature
      handler = schemaOrCallback;
      // Use a default empty schema
      schema = {};
    } else {
      // This is the name+schema+handler signature
      schema = schemaOrCallback;
      handler = handlerOrUndefined;
    }

    // Register the tool definition for ListToolsRequestSchema
    registeredTools.set(name, {
      name,
      description: schema._def?.description || `${name} tool`,
      inputSchema: schema._def ? convertZodSchemaToJsonSchema(schema) : { type: "object", properties: {} },
      annotations: {
        title: schema._def?.description || name,
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    });
    
    // Call the original method with the appropriate signature
    if (typeof schemaOrCallback === 'function' && handlerOrUndefined === undefined) {
      return originalToolMethod(name, schemaOrCallback);
    } else {
      return originalToolMethod(name, schema, handler);
    }
  };

  return server;
}

// Simple converter from Zod schema to JSON Schema (handles basic cases)
function convertZodSchemaToJsonSchema(schema: any) {
  // Check if schema is null or undefined
  if (!schema) {
    return {
      type: "object",
      properties: {}
    };
  }

  const jsonSchema: any = {
    type: "object",
    properties: {},
    required: []
  };

  // Extract properties from zod schema
  if (schema && schema.shape) {
    for (const [propName, propSchema] of Object.entries<any>(schema.shape)) {
      let property: any = {};
      
      // Handle undefined or null propSchema
      if (!propSchema || !propSchema._def) {
        property.type = "string";
        jsonSchema.properties[propName] = property;
        continue;
      }
      
      // Convert type
      if (propSchema._def.typeName === "ZodString") {
        property.type = "string";
      } else if (propSchema._def.typeName === "ZodNumber") {
        property.type = "number";
      } else if (propSchema._def.typeName === "ZodBoolean") {
        property.type = "boolean";
      } else if (propSchema._def.typeName === "ZodArray") {
        property.type = "array";
      } else if (propSchema._def.typeName === "ZodObject") {
        property.type = "object";
      } else if (propSchema._def.typeName === "ZodEnum") {
        property.type = "string";
        property.enum = propSchema._def.values;
      }
      
      // Add description if available
      if (propSchema._def.description) {
        property.description = propSchema._def.description;
      }
      
      // Add default value if available
      if (propSchema._def.defaultValue !== undefined) {
        property.default = propSchema._def.defaultValue;
      }
      
      // Handle optional fields
      if (propSchema._def.typeName !== "ZodOptional" && !propSchema.isOptional) {
        jsonSchema.required.push(propName);
      }
      
      jsonSchema.properties[propName] = property;
    }
  }

  return jsonSchema;
}

/**
 * Search product by name or barcode
 * @param nameOrBarcode Product name or barcode to search for
 * @returns Product data or null if not found
 */
async function findProduct(nameOrBarcode: string): Promise<any> {
  // Check if input is empty
  if (!nameOrBarcode || nameOrBarcode.trim() === '') {
    return null;
  }

  // Normalize input
  const query = nameOrBarcode.trim();
  
  // Check if input is likely a barcode (only digits)
  const isBarcode = /^\d+$/.test(query);
  
  if (isBarcode) {
    try {
      // Direct barcode lookup
      const product = await getProductByBarcode(query);
      if (product) {
        return { product };
      }
    } catch (error) {
      logger.error(`Error fetching product by barcode: ${error}`);
    }
  }
  
  // If not a barcode or barcode lookup failed, try product name search
  try {
    const results = await searchProducts(query, 1, 1);
    if (results && results.products && results.products.length > 0) {
      // Get first product's barcode
      const barcode = results.products[0].barcode;
      if (barcode) {
        // Get complete product data using barcode
        try {
          const product = await getProductByBarcode(barcode);
          return { product };
        } catch (error) {
          logger.error(`Error fetching product details: ${error}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error searching for product by name: ${error}`);
  }
  
  // If all lookups failed
  return null;
}

/**
 * Register all tools with the MCP server
 * @param server The MCP server instance
 * @param developerMode Whether to enable developer-specific tools
 */
export function registerTools(server: McpServer, developerMode = false) {
  // Wrap the server.tool method to track all registered tools
  wrapMcpServerTool(server);
  
  // Always register core food-related tools
  registerAIAnalysisTools(server);
  
  // Only register GitHub issue analysis tools in developer mode
  if (developerMode) {
    registerGitHubIssuesTools(server);
  }

  // Define available tools
  server.server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Set 1 tools - core food product tools that are always available
    const coreProductTools = [
      {
        name: "searchProducts",
        description: "Search for products in the Open Food Facts database by name, brand, category, or other keywords",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query term (product name, brand, category, etc.)"
            },
            page: {
              type: "number",
              description: "Page number for pagination",
              default: 1
            },
            pageSize: {
              type: "number",
              description: "Number of results per page",
              default: 10
            }
          },
          required: ["query"]
        },
        annotations: {
          title: "Search Food Products",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      {
        name: "getProductByBarcode",
        description: "Get detailed information about a product by its barcode (EAN, UPC, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            barcode: {
              type: "string",
              description: "The product barcode (EAN, UPC, etc.)"
            }
          },
          required: ["barcode"]
        },
        annotations: {
          title: "Get Product Details",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      {
        name: "analyzeProduct",
        description: "Analyze a product from the Open Food Facts database using AI",
        inputSchema: {
          type: "object",
          properties: {
            nameOrBarcode: {
              type: "string",
              description: "Product name or barcode (EAN, UPC, etc.)"
            }
          },
          required: ["nameOrBarcode"]
        },
        annotations: {
          title: "AI Product Analysis",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      {
        name: "compareProducts",
        description: "Compare two products from the Open Food Facts database using AI",
        inputSchema: {
          type: "object",
          properties: {
            nameOrBarcode1: {
              type: "string",
              description: "First product's name or barcode (EAN, UPC, etc.)"
            },
            nameOrBarcode2: {
              type: "string",
              description: "Second product's name or barcode (EAN, UPC, etc.)"
            }
          },
          required: ["nameOrBarcode1", "nameOrBarcode2"]
        },
        annotations: {
          title: "AI Product Comparison",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      {
        name: "suggestRecipes",
        description: "Get AI-powered recipe suggestions using a product from the Open Food Facts database",
        inputSchema: {
          type: "object",
          properties: {
            nameOrBarcode: {
              type: "string",
              description: "Product name or barcode (EAN, UPC, etc.)"
            }
          },
          required: ["nameOrBarcode"]
        },
        annotations: {
          title: "AI Recipe Suggestions",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      }
    ];
    
    // GitHub development tools - only available in developer mode
    const developerTools = developerMode ? [
      {
        name: "analyzeGitHubIssue",
        description: "Analyze a specific GitHub issue from Open Food Facts repositories using AI",
        inputSchema: {
          type: "object",
          properties: {
            repo: {
              type: "string",
              description: "The repository name within the openfoodfacts organization"
            },
            issueNumber: {
              type: "number",
              description: "The GitHub issue number to analyze"
            }
          },
          required: ["repo", "issueNumber"]
        },
        annotations: {
          title: "AI GitHub Issue Analysis",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      {
        name: "analyzeGitHubIssuesByLabel",
        description: "Analyze multiple GitHub issues with a specific label from Open Food Facts repositories",
        inputSchema: {
          type: "object",
          properties: {
            repo: {
              type: "string",
              description: "The repository name within the openfoodfacts organization"
            },
            label: {
              type: "string",
              description: "The label to filter issues by"
            },
            state: {
              type: "string",
              description: "Filter issues by state",
              enum: ["open", "closed", "all"],
              default: "open"
            },
            limit: {
              type: "number",
              description: "Maximum number of issues to analyze",
              default: 10
            }
          },
          required: ["repo", "label"]
        },
        annotations: {
          title: "AI GitHub Issues Pattern Analysis",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      {
        name: "createGitHubIssueRoadmap",
        description: "Generate a prioritized roadmap based on open GitHub issues from Open Food Facts repositories",
        inputSchema: {
          type: "object",
          properties: {
            repo: {
              type: "string",
              description: "The repository name within the openfoodfacts organization"
            },
            timeframe: {
              type: "string",
              description: "Timeframe for the roadmap",
              enum: ["short", "medium", "long"],
              default: "medium"
            },
            focusArea: {
              type: "string",
              description: "Optional focus area (e.g., 'mobile', 'backend', 'ui')"
            }
          },
          required: ["repo"]
        },
        annotations: {
          title: "AI GitHub Roadmap Generator",
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      }
    ] : [];

    // Combine core tools with conditionally-included developer tools
    const explicitTools = [...coreProductTools, ...developerTools];
    
    // Combine all tools - include dynamically registered tools only in developer mode
    const allTools = [...explicitTools];
    
    // Add registered tools from registeredTools Map (only in developer mode)
    if (developerMode) {
      for (const [name, toolDef] of registeredTools.entries()) {
        // Check if a tool with this name already exists in explicitTools
        if (!explicitTools.some(tool => tool.name === name)) {
          allTools.push(toolDef);
        }
      }
    }

    return {
      tools: allTools
    };
  });

  // Handle tool execution
  server.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    logger.info(`Tool call received: ${name} with args: ${JSON.stringify(args)}`);

    // Handle search products tool
    if (name === "searchProducts") {
      try {
        const { query, page = 1, pageSize = 10 } = args as { query: string; page?: number; pageSize?: number };
        const results = await searchProducts(query, page, pageSize);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results)
            }
          ]
        };
      } catch (error) {
        logger.error("Error in searchProducts tool:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error searching products: ${errorMessage}`
            }
          ]
        };
      }
    }
    
    // Handle get product by barcode tool
    if (name === "getProductByBarcode") {
      try {
        const { barcode } = args as { barcode: string };
        const product = await getProductByBarcode(barcode);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(product)
            }
          ]
        };
      } catch (error) {
        logger.error("Error in getProductByBarcode tool:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error fetching product: ${errorMessage}`
            }
          ]
        };
      }
    }

    // Handle AI analysis tools with enhanced name or barcode search
    if (name === "analyzeProduct") {
      try {
        const { nameOrBarcode } = args as { nameOrBarcode: string };
        
        // Check if nameOrBarcode is empty
        if (!nameOrBarcode || nameOrBarcode.trim() === '') {
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: "Please provide a product name or barcode. You can use the searchProducts tool first to find products and get their barcodes."
              }
            ]
          };
        }
        
        // Get product data using the findProduct function
        const productData = await findProduct(nameOrBarcode);
        
        if (!productData || !productData.product) {
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: `Product "${nameOrBarcode}" not found in the Open Food Facts database. Please try using the searchProducts tool first to find products matching your query, then use their barcode for analysis.` +
                      `\n\nExample: First search with searchProducts({ "query": "${nameOrBarcode}" }) to find matching products, then use analyzeProduct with the barcode from those results.`
              }
            ]
          };
        }
        
        // Create a sampling request for detailed product analysis
        const systemPrompt = "You are a nutritional expert specializing in analyzing food products. Provide a detailed analysis of the product based on the Open Food Facts data. Include: \n\n1. PRODUCT OVERVIEW: Basic details and classification\n2. NUTRITION ANALYSIS: Review of nutritional data and what it means for dietary considerations\n3. INGREDIENTS ASSESSMENT: Analysis of ingredients, highlighting potential concerns or benefits\n4. ALLERGENS & RESTRICTIONS: Information relevant to dietary restrictions and allergies\n5. HEALTH PERSPECTIVE: Overall assessment from a health and nutrition standpoint\n6. RECOMMENDATIONS: Suggestions for consumers regarding this product";
        
        const samplingRequest = {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Analyze this product from the Open Food Facts database and provide a detailed nutritional assessment:\n\n${JSON.stringify(productData.product, null, 2)}`
              }
            }
          ],
          modelPreferences: {
            hints: [
              { name: "claude-3" },
              { name: "gpt-4" }
            ],
            intelligencePriority: 0.9,
            speedPriority: 0.6,
            costPriority: 0.4
          },
          systemPrompt,
          includeContext: "thisServer" as const,
          temperature: 0.3,
          maxTokens: 1500,
          stopSequences: ["[END]"]
        };
        
        try {
          // Request LLM completion through the client
          const aiResponse = await requestSampling(server, samplingRequest);
          
          // Basic product data as fallback header
          let productName = productData.product.product_name || "Unknown Product";
          let brand = productData.product.brands || "Unknown Brand";
          let nutriscore = productData.product.nutriscore_grade ? `Nutri-Score: ${productData.product.nutriscore_grade.toUpperCase()}` : "";
          let nova = productData.product.nova_group ? `NOVA Group: ${productData.product.nova_group}` : "";
          
          let headerInfo = `# ${productName} (${brand})\n`;
          if (nutriscore || nova) {
            headerInfo += `*${nutriscore}${nutriscore && nova ? ' • ' : ''}${nova}*\n\n`;
          }
          
          // Return the AI-generated analysis with a header
          return {
            content: [
              { 
                type: "text", 
                text: `${headerInfo}${aiResponse.content.text || "Analysis not available for this product."}`
              }
            ]
          };
        } catch (error) {
          logger.error("Error requesting AI product analysis:", error);
          
          // Fallback to basic product information display if AI analysis fails
          return {
            content: [
              { 
                type: "text", 
                text: `Analysis of ${productData.product.product_name || "Unknown Product"}:\n\n` +
                    `Product: ${productData.product.product_name || "N/A"}\n` +
                    `Brand: ${productData.product.brands || "N/A"}\n` +
                    `Nutri-Score: ${productData.product.nutriscore_grade?.toUpperCase() || "N/A"}\n` +
                    `Processing (NOVA): Group ${productData.product.nova_group || "N/A"}\n\n` +
                    `Nutrition Facts (per 100g/100ml):\n` +
                    `- Energy: ${productData.product.nutriments?.energy || "N/A"}\n` +
                    `- Fat: ${productData.product.nutriments?.fat || "N/A"}g\n` +
                    `- Saturated Fat: ${productData.product.nutriments?.["saturated-fat"] || "N/A"}g\n` +
                    `- Carbohydrates: ${productData.product.nutriments?.carbohydrates || "N/A"}g\n` +
                    `- Sugars: ${productData.product.nutriments?.sugars || "N/A"}g\n` +
                    `- Fiber: ${productData.product.nutriments?.fiber || "N/A"}g\n` +
                    `- Proteins: ${productData.product.nutriments?.proteins || "N/A"}g\n` +
                    `- Salt: ${productData.product.nutriments?.salt || "N/A"}g\n\n` +
                    `Ingredients: ${productData.product.ingredients_text || "N/A"}\n\n` +
                    `Allergens: ${productData.product.allergens || "None listed"}\n\n` +
                    `Countries: ${productData.product.countries || "N/A"}`
              }
            ]
          };
        }
      } catch (error) {
        logger.error("Error in analyzeProduct tool:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [
            { 
              type: "text", 
              text: `Failed to analyze product: ${errorMessage}. Please try using the searchProducts tool first to find valid products.` 
            }
          ]
        };
      }
    }
    
    if (name === "compareProducts") {
      try {
        const { nameOrBarcode1, nameOrBarcode2 } = args as { nameOrBarcode1: string, nameOrBarcode2: string };
        
        // Check if either input is empty
        if (!nameOrBarcode1 || nameOrBarcode1.trim() === '') {
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: "Please provide a name or barcode for the first product. You can use the searchProducts tool first to find products and get their barcodes."
              }
            ]
          };
        }
        
        if (!nameOrBarcode2 || nameOrBarcode2.trim() === '') {
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: "Please provide a name or barcode for the second product. You can use the searchProducts tool first to find products and get their barcodes."
              }
            ]
          };
        }
        
        // Fetch both products using the findProduct function
        const [data1, data2] = await Promise.all([
          findProduct(nameOrBarcode1),
          findProduct(nameOrBarcode2)
        ]);
        
        if (!data1 || !data1.product) {
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: `Product "${nameOrBarcode1}" not found in the Open Food Facts database. Please try using the searchProducts tool first to find products matching your query, then use their barcode for comparison.` +
                      `\n\nExample: First search with searchProducts({ "query": "${nameOrBarcode1}" }) to find matching products.`
              }
            ]
          };
        }
        
        if (!data2 || !data2.product) {
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: `Product "${nameOrBarcode2}" not found in the Open Food Facts database. Please try using the searchProducts tool first to find products matching your query, then use their barcode for comparison.` +
                      `\n\nExample: First search with searchProducts({ "query": "${nameOrBarcode2}" }) to find matching products.`
              }
            ]
          };
        }

        // Create a sampling request for AI-powered product comparison
        const systemPrompt = "You are a nutritional expert specializing in comparing food products. Provide a comprehensive comparison between two products based on their Open Food Facts data. Include the following sections:\n\n1. OVERVIEW: Brief introduction to both products and what they are\n2. NUTRITIONAL COMPARISON: Detailed side-by-side comparison of nutrients, highlighting significant differences\n3. INGREDIENTS COMPARISON: Analysis of ingredients lists, highlighting differences and similarities\n4. HEALTH RATING COMPARISON: Compare Nutri-Score, NOVA processing classification, and other health indicators\n5. DIETARY CONSIDERATIONS: Compare allergens, dietary restrictions compatibility (vegan, vegetarian, etc.)\n6. RECOMMENDATION: Which product might be preferable for different dietary needs and why";
        
        const samplingRequest = {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Compare these two food products from the Open Food Facts database and provide a detailed nutritional comparison:\n\nPRODUCT 1:\n${JSON.stringify(data1.product, null, 2)}\n\nPRODUCT 2:\n${JSON.stringify(data2.product, null, 2)}`
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
            costPriority: 0.4
          },
          systemPrompt,
          includeContext: "thisServer" as const,
          temperature: 0.2,
          maxTokens: 2000,
          stopSequences: ["[END]"]
        };
        
        try {
          // Request LLM completion through the client
          const aiResponse = await requestSampling(server, samplingRequest);
          
          // Create a header with basic product info
          const product1Name = data1.product.product_name || "Product 1";
          const product2Name = data2.product.product_name || "Product 2";
          const product1Brand = data1.product.brands || "Unknown Brand";
          const product2Brand = data2.product.brands || "Unknown Brand";
          const product1NutriScore = data1.product.nutriscore_grade ? `Nutri-Score: ${data1.product.nutriscore_grade.toUpperCase()}` : "Nutri-Score: N/A";
          const product2NutriScore = data2.product.nutriscore_grade ? `Nutri-Score: ${data2.product.nutriscore_grade.toUpperCase()}` : "Nutri-Score: N/A";
          
          const headerInfo = `# Comparison: ${product1Name} vs ${product2Name}\n\n` +
                            `**${product1Name}** (${product1Brand}) - ${product1NutriScore}\n` +
                            `**${product2Name}** (${product2Brand}) - ${product2NutriScore}\n\n`;
          
          // Return the AI-generated comparison with a header
          return {
            content: [
              { 
                type: "text", 
                text: `${headerInfo}${aiResponse.content.text || "Comparison analysis not available."}`
              }
            ]
          };
        } catch (error) {
          logger.error("Error requesting AI product comparison:", error);
          
          // Fallback to basic comparison if AI analysis fails
          const basicComparison = `Comparison of ${data1.product.product_name || "Product 1"} vs ${data2.product.product_name || "Product 2"}:\n\n` +
            `NUTRITION GRADE:\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.nutrition_grades || "N/A"}\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.nutrition_grades || "N/A"}\n\n` +
            
            `NUTRI-SCORE:\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.nutriscore_grade || "N/A"}\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.nutriscore_grade || "N/A"}\n\n` +
            
            `PROCESSING LEVEL (NOVA):\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.nova_group || "N/A"}\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.nova_group || "N/A"}\n\n` +
            
            `NUTRITIONAL COMPARISON (per 100g/100ml):\n` +
            `CALORIES:\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.nutriments?.energy || "N/A"} kcal\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.nutriments?.energy || "N/A"} kcal\n\n` +
            
            `FAT:\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.nutriments?.fat || "N/A"}g\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.nutriments?.fat || "N/A"}g\n\n` +
            
            `SATURATED FAT:\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.nutriments?.["saturated-fat"] || "N/A"}g\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.nutriments?.["saturated-fat"] || "N/A"}g\n\n` +
            
            `SUGARS:\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.nutriments?.sugars || "N/A"}g\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.nutriments?.sugars || "N/A"}g\n\n` +
            
            `FIBER:\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.nutriments?.fiber || "N/A"}g\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.nutriments?.fiber || "N/A"}g\n\n` +
            
            `PROTEINS:\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.nutriments?.proteins || "N/A"}g\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.nutriments?.proteins || "N/A"}g\n\n` +
            
            `SALT:\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.nutriments?.salt || "N/A"}g\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.nutriments?.salt || "N/A"}g\n\n` +
            
            `INGREDIENTS:\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.ingredients_text || "N/A"}\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.ingredients_text || "N/A"}\n\n` +
            
            `ADDITIVES COUNT:\n` +
            `${data1.product.product_name || "Product 1"}: ${data1.product.additives_tags?.length || "N/A"}\n` +
            `${data2.product.product_name || "Product 2"}: ${data2.product.additives_tags?.length || "N/A"}`;
          
          return {
            content: [
              { 
                type: "text", 
                text: basicComparison
              }
            ]
          };
        }
      } catch (error) {
        logger.error("Error in compareProducts tool:", error);
        return {
          isError: true,
          content: [
            { 
              type: "text", 
              text: `Failed to compare products: ${error instanceof Error ? error.message : String(error)}. Please try using the searchProducts tool first to find valid products.` 
            }
          ]
        };
      }
    }
    
    if (name === "suggestRecipes") {
      try {
        const { nameOrBarcode } = args as { nameOrBarcode: string };
        
        // Check if nameOrBarcode is empty
        if (!nameOrBarcode || nameOrBarcode.trim() === '') {
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: "Please provide a product name or barcode. You can use the searchProducts tool first to find products and get their barcodes."
              }
            ]
          };
        }
        
        // Fetch product data using the findProduct function
        const productData = await findProduct(nameOrBarcode);
        
        if (!productData || !productData.product) {
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: `Product "${nameOrBarcode}" not found in the Open Food Facts database. Please try using the searchProducts tool first to find products matching your query, then use their barcode for recipe suggestions.` +
                      `\n\nExample: First search with searchProducts({ "query": "${nameOrBarcode}" }) to find matching products, then use suggestRecipes with the barcode from those results.`
              }
            ]
          };
        }

        try {
          // Create the sampling request using the enhanced recipe suggestion function
          const samplingRequest = createRecipeSuggestionRequest(productData.product);
          
          // Request LLM completion through the client
          const response = await requestSampling(server, samplingRequest);
          
          // Return the LLM-generated recipes
          return {
            content: [
              { 
                type: "text", 
                text: `Recipe suggestions using ${productData.product.product_name || "this product"}:\n\n${response.content.text || "No recipe suggestions available"}`
              }
            ]
          };
        } catch (error) {
          logger.error("Error requesting LLM recipes:", error);
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: `Error generating recipe suggestions: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      } catch (error) {
        logger.error("Error in suggestRecipes tool:", error);
        return {
          isError: true,
          content: [
            { 
              type: "text", 
              text: `Failed to suggest recipes: ${error instanceof Error ? error.message : String(error)}. Please try using the searchProducts tool first to find valid products.` 
            }
          ]
        };
      }
    }

    // Handle GitHub tools
    if (name === "analyzeGitHubIssue") {
      try {
        const { org = "openfoodfacts", repo, issueNumber } = args as { org?: string, repo: string, issueNumber: number };
        
        // Validate required arguments
        if (!repo || !repo.trim()) {
          return {
            isError: true,
            content: [{ 
              type: "text", 
              text: "Repository name is required. Please provide a valid repository name from the Open Food Facts organization. For example: 'openfoodfacts-server', 'smooth-app', 'folksonomy_api', etc." 
            }]
          };
        }
        
        if (!issueNumber || isNaN(Number(issueNumber))) {
          return {
            isError: true, 
            content: [{ 
              type: "text", 
              text: "A valid issue number is required. Please provide a numeric issue ID." 
            }]
          };
        }
        
        // Fetch the specific issue
        const baseUrl = `https://api.github.com/repos/${org}`;
        const url = `${baseUrl}/${repo}/issues/${issueNumber}`;
        
        try {
          const response = await fetch(url, {
            headers: {
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "OpenFoodFacts-MCP-Server"
            }
          });
  
          if (response.status === 404) {
            return {
              isError: true,
              content: [
                { 
                  type: "text", 
                  text: `Repository "${org}/${repo}" or issue #${issueNumber} not found. Please verify:\n\n` +
                        `1. The organization name is correct (current: "${org}")\n` +
                        `2. The repository name is correct (current: "${repo}")\n` +
                        `3. The issue number exists (current: #${issueNumber})\n\n` +
                        `You can check available repositories at https://github.com/${org}`
                }
              ]
            };
          } else if (!response.ok) {
            return {
              isError: true,
              content: [
                { 
                  type: "text", 
                  text: `GitHub API error: ${response.status} - ${response.statusText}. Please verify your inputs and try again.` 
                }
              ]
            };
          }
          
          const issue = await response.json();
          
          // Create a sampling request to analyze the issue using AI
          const systemPrompt = "You are an expert software developer and open source contributor specializing in the Open Food Facts ecosystem. Analyze the provided GitHub issue and provide detailed recommendations with these sections:\n\n1. ISSUE SUMMARY: Brief summary of the issue\n2. ROOT CAUSES: Identify potential underlying causes\n3. SOLUTION APPROACHES: Several possible implementation approaches\n4. RECOMMENDED SOLUTION: The best approach with justification\n5. IMPLEMENTATION STEPS: Detailed steps to implement the solution\n6. CODE EXAMPLES: Pseudo-code or actual code examples where appropriate\n7. TESTING STRATEGY: How to test the solution\n8. POTENTIAL CHALLENGES: Any obstacles or considerations";
          
          const samplingRequest = {
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Analyze this GitHub issue from the ${org}/${repo} repository and provide detailed recommendations:\n\n${JSON.stringify(issue, null, 2)}`
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
            includeContext: "thisServer" as const,
            temperature: 0.2,
            maxTokens: 2000,
            stopSequences: ["[END]"]
          };
          
          // Request LLM completion through the client
          const aiResponse = await requestSampling(server, samplingRequest);
          
          return {
            content: [
              { 
                type: "text", 
                text: `Analysis of GitHub Issue #${issueNumber} - ${issue.title}:\n\n${aiResponse.content.text || "No analysis available"}` 
              }
            ]
          };
        } catch (error) {
          logger.error("Error fetching GitHub issue:", error);
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: `Error accessing GitHub issue: ${error instanceof Error ? error.message : String(error)}\n\n` +
                      `Please check that:\n` +
                      `1. The organization exists (current: "${org}")\n` +
                      `2. The repository exists (current: "${repo}")\n` +
                      `3. The issue number is valid (current: ${issueNumber})\n` +
                      `4. You have internet connectivity\n\n` +
                      `You can verify repository names at: https://github.com/${org}`
              }
            ]
          };
        }
      } catch (error) {
        logger.error("Error in analyzeGitHubIssue tool:", error);
        return {
          isError: true,
          content: [
            { 
              type: "text", 
              text: `Failed to analyze GitHub issue: ${error instanceof Error ? error.message : String(error)}. Please check your inputs and try again.` 
            }
          ]
        };
      }
    }
    
    if (name === "analyzeGitHubIssuesByLabel") {
      try {
        const { org = "openfoodfacts", repo, label, state = "open", limit = 10 } = args as { 
          org?: string, 
          repo: string, 
          label: string, 
          state?: string, 
          limit?: number 
        };
        
        // Validate required arguments
        if (!repo || !repo.trim()) {
          return {
            isError: true,
            content: [{ 
              type: "text", 
              text: "Repository name is required. Please provide a valid repository name from the Open Food Facts organization. For example: 'openfoodfacts-server', 'smooth-app', 'folksonomy_api', etc." 
            }]
          };
        }
        
        if (!label || !label.trim()) {
          return {
            isError: true, 
            content: [{ 
              type: "text", 
              text: "A label is required. Please provide a valid label to filter issues by. Common labels include: 'bug', 'enhancement', 'documentation', 'good first issue', etc." 
            }]
          };
        }
        
        // Fetch issues with the specific label
        const baseUrl = `https://api.github.com/repos/${org}`;
        const url = `${baseUrl}/${repo}/issues?state=${state}&labels=${encodeURIComponent(label)}&per_page=${limit}`;
        
        try {
          const response = await fetch(url, {
            headers: {
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "OpenFoodFacts-MCP-Server"
            }
          });
  
          if (response.status === 404) {
            return {
              isError: true,
              content: [
                { 
                  type: "text", 
                  text: `Repository "${org}/${repo}" not found. Please verify:\n\n` +
                        `1. The organization name is correct (current: "${org}")\n` +
                        `2. The repository name is correct (current: "${repo}")\n\n` +
                        `You can check available repositories at https://github.com/${org}`
                }
              ]
            };
          } else if (!response.ok) {
            return {
              isError: true,
              content: [
                { 
                  type: "text", 
                  text: `GitHub API error: ${response.status} - ${response.statusText}. Please verify your inputs and try again.` 
                }
              ]
            };
          }
          
          const issues = await response.json();
          
          if (!issues || issues.length === 0) {
            return {
              isError: true,
              content: [
                { 
                  type: "text", 
                  text: `No GitHub issues found with label '${label}' in state '${state}' for repository '${org}/${repo}'.\n\n` +
                        `Please try:\n` +
                        `1. A different label\n` +
                        `2. A different state ('open', 'closed', or 'all')\n` +
                        `3. Checking available labels at: https://github.com/${org}/${repo}/labels`
                }
              ]
            };
          }
          
          // Extract essential data to avoid token limit issues
          const simplifiedIssues = issues.map((issue: any) => ({
            number: issue.number,
            title: issue.title,
            labels: issue.labels.map((l: any) => l.name),
            created_at: issue.created_at,
            body: issue.body?.substring(0, 500) + (issue.body?.length > 500 ? "..." : ""),
            comments: issue.comments
          }));
          
          // Create a sampling request for pattern analysis
          const systemPrompt = "You are an expert software developer and open source contributor specializing in the Open Food Facts ecosystem. Analyze the provided GitHub issues and identify patterns and systemic improvements with these sections:\n\n1. COMMON THEMES: Identify recurring issues or themes\n2. SYSTEMIC PROBLEMS: Potential underlying architectural or process issues\n3. PRIORITY RECOMMENDATIONS: Which issues should be addressed first and why\n4. LONG-TERM IMPROVEMENTS: Strategic changes to reduce similar issues\n5. SUGGESTED PROCESS CHANGES: How the development process might be improved\n6. RESOURCE ALLOCATION: How to allocate developer resources efficiently";
          
          const samplingRequest = {
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Analyze these GitHub issues from the ${org}/${repo} repository and identify patterns and systemic improvements:\n\n${JSON.stringify(simplifiedIssues, null, 2)}`
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
            includeContext: "thisServer" as const,
            temperature: 0.3,
            maxTokens: 2000,
            stopSequences: ["[END]"]
          };
          
          // Request LLM completion through the client
          const aiResponse = await requestSampling(server, samplingRequest);
          
          return {
            content: [
              { 
                type: "text", 
                text: `Analysis of ${issues.length} GitHub Issues with label '${label}' from ${org}/${repo}:\n\n${aiResponse.content.text || "No analysis available"}` 
              }
            ]
          };
        } catch (error) {
          logger.error("Error fetching GitHub issues by label:", error);
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: `Error accessing GitHub issues: ${error instanceof Error ? error.message : String(error)}\n\n` +
                      `Please check that:\n` +
                      `1. The organization exists (current: "${org}")\n` +
                      `2. The repository exists (current: "${repo}")\n` +
                      `3. You have internet connectivity\n\n` +
                      `You can verify repository names at: https://github.com/${org}`
              }
            ]
          };
        }
      } catch (error) {
        logger.error("Error in analyzeGitHubIssuesByLabel tool:", error);
        return {
          isError: true,
          content: [
            { 
              type: "text", 
              text: `Failed to analyze GitHub issues: ${error instanceof Error ? error.message : String(error)}. Please check your inputs and try again.` 
            }
          ]
        };
      }
    }
    
    if (name === "createGitHubIssueRoadmap") {
      try {
        const { org = "openfoodfacts", repo, timeframe = "medium", focusArea } = args as { 
          org?: string, 
          repo: string, 
          timeframe?: string, 
          focusArea?: string 
        };
        
        // Validate required arguments
        if (!repo || !repo.trim()) {
          return {
            isError: true,
            content: [{ 
              type: "text", 
              text: "Repository name is required. Please provide a valid repository name from the Open Food Facts organization. For example: 'openfoodfacts-server', 'smooth-app', 'folksonomy_api', etc." 
            }]
          };
        }
        
        // Fetch open issues
        const baseUrl = `https://api.github.com/repos/${org}`;
        const url = `${baseUrl}/${repo}/issues?state=open&per_page=30`;
        
        try {
          const response = await fetch(url, {
            headers: {
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "OpenFoodFacts-MCP-Server"
            }
          });
    
          if (response.status === 404) {
            return {
              isError: true,
              content: [
                { 
                  type: "text", 
                  text: `Repository "${org}/${repo}" not found. Please verify:\n\n` +
                        `1. The organization name is correct (current: "${org}")\n` +
                        `2. The repository name is correct (current: "${repo}")\n\n` +
                        `You can check available Open Food Facts repositories at https://github.com/${org}?q=&type=all&language=&sort=`
                }
              ]
            };
          } else if (!response.ok) {
            return {
              isError: true,
              content: [
                { 
                  type: "text", 
                  text: `GitHub API error: ${response.status} - ${response.statusText}. Please verify your inputs and try again.` 
                }
              ]
            };
          }
          
          let issues = await response.json();
          
          if (!issues || issues.length === 0) {
            return {
              isError: true,
              content: [
                { 
                  type: "text", 
                  text: `No open GitHub issues found in repository '${org}/${repo}'.\n\n` +
                       `This could be because:\n` +
                       `1. The repository truly has no open issues\n` +
                       `2. There might be issues but they're all pull requests\n\n` +
                       `You can verify this at: https://github.com/${org}/${repo}/issues`
                }
              ]
            };
          }
          
          // Filter by focus area if provided
          if (focusArea) {
            const originalCount = issues.length;
            issues = issues.filter((issue: any) => {
              // Check if focus area appears in title, body, or labels
              const focusAreaLower = focusArea.toLowerCase();
              const titleMatch = issue.title.toLowerCase().includes(focusAreaLower);
              const bodyMatch = issue.body && issue.body.toLowerCase().includes(focusAreaLower);
              const labelsMatch = issue.labels.some((l: any) => 
                l.name.toLowerCase().includes(focusAreaLower));
              return titleMatch || bodyMatch || labelsMatch;
            });
            
            if (issues.length === 0) {
              return {
                isError: true,
                content: [
                  { 
                    type: "text", 
                    text: `No open GitHub issues found related to '${focusArea}' in repository '${org}/${repo}'.\n\n` +
                         `There are ${originalCount} open issues, but none match your focus area.\n\n` +
                         `Try:\n` +
                         `1. A different focus area term\n` +
                         `2. Omitting the focus area to create a roadmap for all issues\n` +
                         `3. Checking available issue labels at: https://github.com/${org}/${repo}/labels`
                  }
                ]
              };
            }
          }
          
          // Prepare simplified issues array for the roadmap request
          const simplifiedIssues = issues.map((i: any) => ({
            number: i.number,
            title: i.title,
            labels: i.labels.map((l: any) => l.name),
            created_at: i.created_at,
            updated_at: i.updated_at,
            comments: i.comments
          }));
          
          // Create a sampling request for roadmap generation
          const systemPrompt = `You are a product manager and technical lead for the ${org}/${repo} repository. Create a prioritized ${timeframe}-term roadmap based on the provided GitHub issues. Include:\n\n1. EXECUTIVE SUMMARY: Brief overview of key priorities\n2. PRIORITY ISSUES: List of issues to address first with justification\n3. IMPLEMENTATION TIMELINE: Suggested schedule broken down by weeks/months\n4. RESOURCE REQUIREMENTS: Estimated developer hours and specialties needed\n5. DEPENDENCIES: How issues relate and depend on each other\n6. SUCCESS METRICS: How to measure successful implementation\n7. RISKS AND MITIGATIONS: Potential challenges and how to address them`;
          
          const samplingRequest = {
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Generate a prioritized ${timeframe}-term roadmap based on these open GitHub issues from the ${org}/${repo} repository${focusArea ? ` focusing on ${focusArea}` : ''}:\n\n${JSON.stringify(simplifiedIssues, null, 2)}`
                }
              }
            ],
            modelPreferences: {
              hints: [
                { name: "claude-3" },
                { name: "gpt-4" }
              ],
              intelligencePriority: 0.9,
              speedPriority: 0.3,
              costPriority: 0.4
            },
            systemPrompt,
            includeContext: "thisServer" as const,
            temperature: 0.4,
            maxTokens: 2500,
            stopSequences: ["[END]"]
          };
          
          // Request LLM completion through the client
          const aiResponse = await requestSampling(server, samplingRequest);
          
          return {
            content: [
              { 
                type: "text", 
                text: `${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}-Term Roadmap for ${org}/${repo}${focusArea ? ` (${focusArea})` : ''}:\n\n${aiResponse.content.text || "No roadmap available"}` 
              }
            ]
          };
        } catch (error) {
          logger.error("Error fetching GitHub issues for roadmap:", error);
          return {
            isError: true,
            content: [
              { 
                type: "text", 
                text: `Error accessing GitHub repository: ${error instanceof Error ? error.message : String(error)}\n\n` +
                      `Please check that:\n` +
                      `1. The organization exists (current: "${org}")\n` +
                      `2. The repository exists (current: "${repo}")\n` +
                      `3. You have internet connectivity\n\n` +
                      `Popular Open Food Facts repositories include:\n` +
                      `- openfoodfacts-server\n` +
                      `- smooth-app\n` +
                      `- folksonomy_api\n` +
                      `- open-food-network\n` +
                      `- robotoff\n\n` +
                      `You can verify other repository names at: https://github.com/${org}`
              }
            ]
          };
        }
      } catch (error) {
        logger.error("Error in createGitHubIssueRoadmap tool:", error);
        return {
          isError: true,
          content: [
            { 
              type: "text", 
              text: `Failed to create GitHub issues roadmap: ${error instanceof Error ? error.message : String(error)}. Please check your inputs and try again.` 
            }
          ]
        };
      }
    }

    // If tool not found
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Tool not found: ${name}`
        }
      ]
    };
  });

  logger.info("Open Food Facts MCP tools registered successfully");
}