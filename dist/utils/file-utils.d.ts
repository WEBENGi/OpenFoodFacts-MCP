/**
 * Gets directory contents with type information
 * @param dirPath Path to the directory relative to project root
 * @returns Array of entries with their types
 */
export declare function getDirectoryContents(dirPath: string): Promise<string>;
/**
 * Gets file contents with metadata
 * @param filepath Path to file relative to project root
 * @returns File content and metadata
 */
export declare function getFileContents(filepath: string): Promise<{
    content: string;
    metadata: {
        filename: string;
        extension: string;
        size: number;
        lastModified: string;
    };
}>;
/**
 * Attempts to read a JSON file
 * @param filepath Path to JSON file relative to project root
 * @returns Parsed JSON object or default value if file doesn't exist
 */
export declare function readJsonFile<T>(filepath: string, defaultValue: T): Promise<T>;
/**
 * Find taxonomy file in possible locations
 * @param taxonomyId ID of the taxonomy to locate
 * @returns Object with content and path if found
 */
export declare function findTaxonomyFile(taxonomyId: string): Promise<{
    content: string;
    path: string;
} | null>;
