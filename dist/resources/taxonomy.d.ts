/**
 * Handle requests for taxonomy information
 * @param uri Resource URI
 * @param url Parsed URL object
 * @returns Response with processed taxonomy content
 */
export declare function handleTaxonomy(uri: string, url: URL): Promise<{
    contents: {
        uri: string;
        text: string;
        metadata: {
            taxonomyId: string;
            filepath: string;
        };
    }[];
} | {
    contents: {
        uri: string;
        text: string;
        metadata: {
            taxonomyId: string;
            filepath: string;
            isMock: boolean;
        };
    }[];
} | {
    contents: {
        uri: string;
        text: string;
        isError: boolean;
    }[];
}>;
