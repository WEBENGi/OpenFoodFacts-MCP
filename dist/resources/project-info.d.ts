/**
 * Handle requests for project information
 * @param uri Resource URI
 * @returns Response with project information
 */
export declare function handleProjectInfo(uri: string): Promise<{
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
}>;
/**
 * Handle requests for project structure
 * @param uri Resource URI
 * @returns Response with project structure information
 */
export declare function handleProjectStructure(uri: string): Promise<{
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
}>;
