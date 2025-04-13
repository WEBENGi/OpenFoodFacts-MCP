import { getFileContents } from "../utils/file-utils.js";
/**
 * Handle requests for the file content resource
 * @param uri Resource URI
 * @param url Parsed URL object
 * @returns Response with file content and metadata
 */
export async function handleFileContent(uri, url) {
    try {
        // Extract filepath from URI - everything after //file/
        const filepath = url.pathname.replace(/^\/\/file\//, "");
        if (!filepath) {
            throw new Error("Filepath parameter is required");
        }
        try {
            const { content, metadata } = await getFileContents(filepath);
            return {
                contents: [{
                        uri,
                        text: content,
                        metadata
                    }]
            };
        }
        catch (error) {
            return {
                contents: [{
                        uri,
                        text: `Error accessing file: ${error instanceof Error ? error.message : String(error)}`,
                        isError: true
                    }]
            };
        }
    }
    catch (error) {
        return {
            contents: [{
                    uri,
                    text: `Error processing request: ${error instanceof Error ? error.message : String(error)}`,
                    isError: true
                }]
        };
    }
}
