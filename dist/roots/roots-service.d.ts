import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
declare class RootsRegistry {
    private currentRoots;
    /**
     * Update the known roots with new ones from the client
     *
     * @param roots The new roots to set
     */
    updateRoots(roots: Root[]): void;
    /**
     * Get all current roots
     *
     * @returns The current roots
     */
    getRoots(): Root[];
    /**
     * Check if a URI is within any of the current roots
     *
     * @param uri The URI to check
     * @returns True if the URI is within at least one root
     */
    isWithinRoots(uri: string): boolean;
    /**
     * Get the most specific root that contains a URI
     *
     * @param uri The URI to check
     * @returns The most specific root that contains the URI, or undefined if none
     */
    getRootForURI(uri: string): Root | undefined;
}
export declare const rootsRegistry: RootsRegistry;
/**
 * Setup roots handling for the server
 *
 * @param server The MCP server instance
 */
export declare function setupRoots(server: McpServer): void;
export {};
