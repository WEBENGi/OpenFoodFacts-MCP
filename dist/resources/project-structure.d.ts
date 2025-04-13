/**
 * Handle requests for the project structure resource
 * @param uri Resource URI
 * @param url Parsed URL object
 * @returns Response with directory contents
 */
export declare function handleProjectStructure(uri: string, url: URL): Promise<{
    contents: {
        uri: string;
        text: string;
    }[];
} | {
    contents: {
        uri: string;
        text: string;
        isError: boolean;
    }[];
}>;
