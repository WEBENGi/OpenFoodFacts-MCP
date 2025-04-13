/**
 * Resource descriptor interface
 */
export interface ResourceDescriptor {
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
    developerOnly?: boolean;
}
/**
 * List of available resources in the MCP server
 */
export declare const availableResources: ResourceDescriptor[];
/**
 * Filter resources based on developer mode
 * @param resources List of resources to filter
 * @returns Filtered resources based on developer mode
 */
export declare function filterResourcesForStandardMode(resources: ResourceDescriptor[]): ResourceDescriptor[];
/**
 * Route a resource request to the appropriate handler
 * @param uri The resource URI
 * @param developerMode Whether developer mode is enabled
 * @returns Response for the requested resource
 */
export declare function routeResourceRequest(uri: string, developerMode?: boolean): Promise<{
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
