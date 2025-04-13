/**
 * Handle requests for static text resources
 * @param uri Resource URI
 * @returns Response with appropriate static content
 */
export declare function handleStaticResource(uri: string): {
    contents: {
        uri: string;
        text: string;
    }[];
} | {
    contents: {
        uri: string;
        text: string;
        metadata: {
            taxonomyId: string;
            contentType: string;
        };
    }[];
};
