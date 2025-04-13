/**
 * Resource Templates for Open Food Facts MCP Server
 * Provides templated resources for common development tasks
 */
/**
 * Handle requests for resource templates
 * @param uri Resource URI
 * @returns Response with template content
 */
export declare function handleResourceTemplate(uri: string): Promise<{
    contents: {
        uri: string;
        text: string;
        metadata: {
            contentType: string;
        };
    }[];
} | {
    contents: {
        uri: string;
        text: string;
        isError: boolean;
    }[];
} | {
    contents: {
        uri: string;
        text: string;
        metadata: {
            templateId: string;
            templateName: string;
            contentType: string;
        };
    }[];
}>;
