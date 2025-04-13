/**
 * Resource descriptor interface
 */
export interface ResourceDescriptor {
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
}
/**
 * List of available resources in the MCP server
 */
export declare const availableResources: ResourceDescriptor[];
/**
 * Route a resource request to the appropriate handler
 * @param uri The resource URI
 * @returns Response for the requested resource
 */
export declare function routeResourceRequest(uri: string): Promise<{
    contents: {
        uri: string;
        text: string;
    }[];
} | {
    contents: {
        uri: string;
        text: string;
        mimeType: string;
    }[];
}>;
