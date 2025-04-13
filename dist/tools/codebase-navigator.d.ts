export interface RepoStructureEntry {
    path: string;
    type: 'file' | 'directory';
    size?: number;
    children?: RepoStructureEntry[];
    language?: string;
}
export interface FileWithContext {
    path: string;
    content: string;
    lineCount: number;
    language?: string;
}
export interface CodeExplanationResult {
    overview: string;
    keyComponents: string[];
    architectureDescription: string;
    entryPoints: string[];
    dataFlow: string;
    technologiesUsed: string[];
    gettingStarted: string;
    recommendedReading: string[];
}
/**
 * Analyzes a repository structure to provide an overview of its organization
 * @param repoPath Path to the repository root
 * @param maxDepth Maximum depth to traverse (default: 2)
 * @param excludePatterns Array of patterns to exclude (e.g., ["node_modules", ".git"])
 * @returns A structured representation of the repository
 */
export declare function analyzeRepoStructure(repoPath: string, maxDepth?: number, excludePatterns?: string[]): Promise<RepoStructureEntry>;
/**
 * Finds important files in a repository based on common patterns
 * @param repoPath Path to the repository root
 * @returns List of important files
 */
export declare function findImportantFiles(repoPath: string): Promise<string[]>;
/**
 * Reads a specific file with context
 * @param repoPath Path to the repository root
 * @param filePath Relative path to the file within the repository
 * @returns File content with context information
 */
export declare function readFileWithContext(repoPath: string, filePath: string): Promise<FileWithContext>;
/**
 * Estimates the primary language(s) used in the repository
 * @param repoPath Path to the repository root
 * @returns Object mapping languages to line counts
 */
export declare function estimateRepoLanguages(repoPath: string): Promise<Record<string, number>>;
/**
 * Searches for a pattern in the repository
 * @param repoPath Path to the repository root
 * @param pattern The pattern to search for
 * @returns Array of files containing the pattern
 */
export declare function searchInRepo(repoPath: string, pattern: string): Promise<string[]>;
/**
 * Gets information about dependencies from package files
 * @param repoPath Path to the repository root
 * @returns Object containing dependency information
 */
export declare function getDependencyInfo(repoPath: string): Promise<Record<string, any>>;
/**
 * Analyzes a codebase using AI sampling to provide insights
 * @param repoPath Path to the repository root
 * @param repoStructure Repository structure information
 * @param importantFiles List of important files in the repository
 * @param languageUsage Language usage statistics
 * @param dependencies Project dependencies
 * @returns AI-generated analysis of the codebase
 */
export declare function generateCodebaseExplanation(repoPath: string, repoStructure: RepoStructureEntry, importantFiles: string[], languageUsage: Record<string, number>, dependencies: Record<string, any>): Promise<CodeExplanationResult>;
export declare function formatBytes(bytes: number, decimals?: number): string;
