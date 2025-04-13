import fs from "fs";
import path from "path";
import { projectRoot } from "../config/server-config.js";

/**
 * Gets directory contents with type information
 * @param dirPath Path to the directory relative to project root
 * @returns Array of entries with their types
 */
export async function getDirectoryContents(dirPath: string): Promise<string> {
  const fullPath = path.resolve(projectRoot, dirPath);
  
  // Security check to prevent directory traversal
  if (!fullPath.startsWith(projectRoot)) {
    throw new Error("Access denied: Path outside project directory");
  }
  
  const stats = await fs.promises.stat(fullPath);
  if (!stats.isDirectory()) {
    throw new Error(`Not a directory: ${dirPath}`);
  }
  
  const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
  return entries.map(entry => {
    const type = entry.isDirectory() ? "directory" : "file";
    return `${entry.name} (${type})`;
  }).join("\n");
}

/**
 * Gets file contents with metadata
 * @param filepath Path to file relative to project root
 * @returns File content and metadata
 */
export async function getFileContents(filepath: string): Promise<{
  content: string;
  metadata: {
    filename: string;
    extension: string;
    size: number;
    lastModified: string;
  }
}> {
  const fullPath = path.resolve(projectRoot, filepath);
  
  // Security check to prevent directory traversal
  if (!fullPath.startsWith(projectRoot)) {
    throw new Error("Access denied: Path outside project directory");
  }
  
  const stats = await fs.promises.stat(fullPath);
  if (!stats.isFile()) {
    throw new Error(`Not a file: ${filepath}`);
  }
  
  const content = await fs.promises.readFile(fullPath, 'utf8');
  
  return {
    content,
    metadata: {
      filename: path.basename(filepath),
      extension: path.extname(filepath),
      size: stats.size,
      lastModified: stats.mtime.toISOString()
    }
  };
}

/**
 * Attempts to read a JSON file
 * @param filepath Path to JSON file relative to project root
 * @returns Parsed JSON object or default value if file doesn't exist
 */
export async function readJsonFile<T>(filepath: string, defaultValue: T): Promise<T> {
  try {
    const fullPath = path.resolve(projectRoot, filepath);
    const content = await fs.promises.readFile(fullPath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Find taxonomy file in possible locations
 * @param taxonomyId ID of the taxonomy to locate
 * @returns Object with content and path if found
 */
export async function findTaxonomyFile(taxonomyId: string): Promise<{
  content: string;
  path: string;
} | null> {
  // Map taxonomy ID to potential file locations
  const taxonomyPaths = [
    `taxonomies/${taxonomyId}/taxonomy.txt`,
    `taxonomies/${taxonomyId}.txt`,
    `taxonomies/${taxonomyId}`,
    // Add more potential paths to cover all possibilities
    `taxonomies/${taxonomyId}.txt.typed`,
    `../taxonomies/${taxonomyId}/taxonomy.txt`,
    `../taxonomies/${taxonomyId}.txt`,
    `../taxonomies/${taxonomyId}`,
    `../taxonomies/${taxonomyId}.txt.typed`
  ];
  
  // Try to find the taxonomy file
  for (const potentialPath of taxonomyPaths) {
    try {
      const fullPath = path.resolve(projectRoot, potentialPath);
      
      // Debug log to help diagnose issues
      console.debug(`Looking for taxonomy ${taxonomyId} at: ${fullPath}`);
      
      const stat = await fs.promises.stat(fullPath);
      
      if (stat.isFile()) {
        const content = await fs.promises.readFile(fullPath, 'utf8');
        console.debug(`Found taxonomy ${taxonomyId} at: ${fullPath}`);
        return {
          content,
          path: potentialPath
        };
      }
    } catch (err) {
      // File doesn't exist, try the next path
      continue;
    }
  }
  
  // If we reach here, we couldn't find the taxonomy file
  console.warn(`Taxonomy not found: ${taxonomyId}`);
  return null;
}