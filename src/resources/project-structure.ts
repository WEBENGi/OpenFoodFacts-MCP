import { getDirectoryContents } from "../utils/file-utils.js";

/**
 * Handle requests for the project structure resource
 * @param uri Resource URI
 * @param url Parsed URL object
 * @returns Response with directory contents
 */
export async function handleProjectStructure(uri: string, url: URL) {
  try {
    // Extract path from URI - everything after //structure/
    const targetPath = url.pathname.replace(/^\/\/structure\/?/, "") || "";
    
    try {
      const directoryContents = await getDirectoryContents(targetPath);
      
      return {
        contents: [{
          uri,
          text: `Directory ${targetPath || "root"}:\n${directoryContents}`
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri,
          text: `Error accessing directory: ${error instanceof Error ? error.message : String(error)}`,
          isError: true
        }]
      };
    }
  } catch (error) {
    return {
      contents: [{
        uri,
        text: `Error processing request: ${error instanceof Error ? error.message : String(error)}`,
        isError: true
      }]
    };
  }
}