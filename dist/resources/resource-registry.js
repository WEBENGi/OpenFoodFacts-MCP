import { handleFileContent } from "./file-content.js";
import { handleProjectInfo, handleProjectStructure } from "./project-info.js";
import { handleTaxonomy } from "./taxonomy.js";
import { handleStaticResource } from "./static-resources.js";
import { handleResourceTemplate } from "./resource-templates.js";
import { rootsRegistry } from "../roots/index.js";
/**
 * List of available resources in the MCP server
 */
export const availableResources = [
    {
        uri: "openfoodfacts://structure/",
        name: "Project Structure",
        description: "Navigate the directory structure of the Open Food Facts codebase"
    },
    {
        uri: "openfoodfacts://info",
        name: "Project Information",
        description: "Overview of the Open Food Facts project and its components",
        mimeType: "application/json"
    },
    {
        uri: "openfoodfacts://schema",
        name: "Database Schema",
        description: "Information about the Open Food Facts data model"
    },
    {
        uri: "openfoodfacts://api-docs",
        name: "API Documentation",
        description: "Documentation of the Open Food Facts API endpoints"
    },
    {
        uri: "openfoodfacts://code-patterns",
        name: "Code Patterns",
        description: "Common patterns and conventions in the Open Food Facts codebase"
    },
    {
        uri: "openfoodfacts://file-organization",
        name: "File Organization",
        description: "How files are organized in the Open Food Facts project"
    },
    {
        uri: "openfoodfacts://taxonomy/categories",
        name: "Categories Taxonomy",
        description: "Food categories taxonomy used in Open Food Facts"
    },
    {
        uri: "openfoodfacts://template/",
        name: "Resource Templates",
        description: "Templates for common Open Food Facts development tasks"
    }
];
/**
 * Check if a resource URI is accessible based on current roots
 *
 * @param uri The resource URI to check
 * @returns True if the resource is accessible, false otherwise
 */
function isResourceAccessible(uri) {
    // OpenFoodFacts specific URIs are always accessible
    if (uri.startsWith('openfoodfacts://')) {
        return true;
    }
    // For file:// URIs and other URIs, check if they're within roots
    return rootsRegistry.isWithinRoots(uri);
}
/**
 * Route a resource request to the appropriate handler
 * @param uri The resource URI
 * @returns Response for the requested resource
 */
export async function routeResourceRequest(uri) {
    const url = new URL(uri);
    // Check if the resource is accessible based on defined roots
    if (!isResourceAccessible(uri)) {
        return {
            contents: [{
                    uri,
                    text: `Access denied: The requested resource is not within any defined root`,
                    isError: true
                }]
        };
    }
    // Route to the appropriate handler based on URI pattern
    try {
        // Handle project structure resource
        if (url.protocol === "openfoodfacts:" && url.pathname.startsWith("//structure")) {
            return await handleProjectStructure(uri);
        }
        // Handle file content resource
        if (url.protocol === "openfoodfacts:" && url.pathname.startsWith("//file/")) {
            return await handleFileContent(uri, url);
        }
        // Handle project info resource
        if (uri === "openfoodfacts://info") {
            return await handleProjectInfo(uri);
        }
        // Handle taxonomy resource
        if (url.protocol === "openfoodfacts:" && url.pathname.startsWith("//taxonomy/")) {
            // Special case for categories taxonomy which is handled as a static resource
            if (uri === "openfoodfacts://taxonomy/categories") {
                return handleStaticResource(uri);
            }
            // All other taxonomies go through the dynamic handler
            return await handleTaxonomy(uri, url);
        }
        // Handle resource templates
        if (url.protocol === "openfoodfacts:" && url.pathname.startsWith("//template")) {
            return await handleResourceTemplate(uri);
        }
        // Handle static resources (schema, api-docs, code-patterns, file-organization)
        if ([
            "openfoodfacts://schema",
            "openfoodfacts://api-docs",
            "openfoodfacts://code-patterns",
            "openfoodfacts://file-organization"
        ].includes(uri)) {
            return handleStaticResource(uri);
        }
        // Handle file URLs - check if they are within allowed roots
        if (url.protocol === "file:") {
            const root = rootsRegistry.getRootForURI(uri);
            if (root) {
                // Process file request if within a root
                // For now we'll just return a placeholder
                return {
                    contents: [{
                            uri,
                            text: `File content accessed via root: ${root.name || root.uri}`,
                            mimeType: "text/plain"
                        }]
                };
            }
            else {
                throw new Error(`File is not within any defined root`);
            }
        }
        // Resource not found
        throw new Error(`Resource not found: ${uri}`);
    }
    catch (error) {
        // Return error response
        return {
            contents: [{
                    uri,
                    text: `Error processing request: ${error instanceof Error ? error.message : String(error)}`,
                    isError: true
                }]
        };
    }
}
