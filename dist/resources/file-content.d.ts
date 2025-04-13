/**
 * Handle requests for the file content resource
 * @param uri Resource URI
 * @param url Parsed URL object
 * @returns Response with file content and metadata
 */
export declare function handleFileContent(uri: string, url: URL): Promise<{
    contents: {
        uri: string;
        text: string;
        metadata: {
            filename: string;
            extension: string;
            size: number;
            lastModified: string;
        };
    }[];
} | {
    contents: {
        uri: string;
        text: string;
        isError: boolean;
    }[];
}>;
