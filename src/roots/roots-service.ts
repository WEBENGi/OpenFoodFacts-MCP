import { ListRootsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../transport/transports.js";

/**
 * Represents a root URI that defines a boundary where the server can operate
 */
export interface Root {
  uri: string;
  name?: string;
}

/**
 * Singleton class to store and manage root URIs
 */
class RootsRegistry {
  // The current roots provided by the client
  private currentRoots: Root[] = [];

  /**
   * Update the known roots with new ones from the client
   * 
   * @param roots The new roots to set
   */
  public updateRoots(roots: Root[]) {
    logger.info(`Updating roots: ${JSON.stringify(roots, null, 2)}`);
    this.currentRoots = roots;
  }

  /**
   * Get all current roots
   * 
   * @returns The current roots
   */
  public getRoots(): Root[] {
    return [...this.currentRoots];
  }

  /**
   * Check if a URI is within any of the current roots
   * 
   * @param uri The URI to check
   * @returns True if the URI is within at least one root
   */
  public isWithinRoots(uri: string): boolean {
    if (this.currentRoots.length === 0) {
      // If no roots are defined, allow access to all resources
      return true;
    }

    return this.currentRoots.some(root => uri.startsWith(root.uri));
  }

  /**
   * Get the most specific root that contains a URI
   * 
   * @param uri The URI to check
   * @returns The most specific root that contains the URI, or undefined if none
   */
  public getRootForURI(uri: string): Root | undefined {
    if (this.currentRoots.length === 0) {
      return undefined;
    }

    // Sort roots by length (descending) to find the most specific match
    const matchingRoots = this.currentRoots
      .filter(root => uri.startsWith(root.uri))
      .sort((a, b) => b.uri.length - a.uri.length);

    return matchingRoots[0];
  }
}

// Create a singleton instance
export const rootsRegistry = new RootsRegistry();

/**
 * Setup roots handling for the server
 * 
 * @param server The MCP server instance
 */
export function setupRoots(server: McpServer) {
  // Handler for roots/update request
  server.server.setRequestHandler(ListRootsRequestSchema, async (request) => {
    // Extract roots from the actual property in the request
    const rootItems = request.params?.items || [];
    // Ensure items conform to Root[] type
    const roots: Root[] = Array.isArray(rootItems) ? rootItems.map(item => ({
      uri: item.uri || '',
      name: item.name
    })) : [];
    rootsRegistry.updateRoots(roots);
    
    return {
      // No response body needed
    };
  });

  logger.info("Roots capability initialized");
}