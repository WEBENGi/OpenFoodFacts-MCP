import fs from "fs";
import { projectRoot } from "../config/server-config.js";
import { readJsonFile, getDirectoryContents } from "../utils/file-utils.js";
/**
 * Handle requests for project information
 * @param uri Resource URI
 * @returns Response with project information
 */
export async function handleProjectInfo(uri) {
    try {
        // Get default package info
        const defaultPackageInfo = {
            name: "Open Food Facts Server",
            version: "Unknown",
            description: "Open Food Facts is a food products database made by everyone, for everyone."
        };
        // Try to read package.json if it exists
        const packageInfo = await readJsonFile('package.json', defaultPackageInfo);
        // Get project structure overview - list directories
        const dirs = fs.readdirSync(projectRoot, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        const info = {
            name: packageInfo.name || defaultPackageInfo.name,
            version: packageInfo.version || defaultPackageInfo.version,
            description: packageInfo.description || defaultPackageInfo.description,
            mainDirectories: dirs,
            technologies: [
                "Perl (core backend)",
                "JavaScript/TypeScript (frontend)",
                "HTML/CSS (UI)",
                "MongoDB (database)",
                "Docker (containerization)",
                "Foundation Framework (UI)"
            ]
        };
        return {
            contents: [{
                    uri,
                    text: JSON.stringify(info, null, 2),
                    metadata: {
                        contentType: "application/json"
                    }
                }]
        };
    }
    catch (error) {
        return {
            contents: [{
                    uri,
                    text: `Error retrieving project info: ${error instanceof Error ? error.message : String(error)}`,
                    isError: true
                }]
        };
    }
}
/**
 * Handle requests for project structure
 * @param uri Resource URI
 * @returns Response with project structure information
 */
export async function handleProjectStructure(uri) {
    try {
        // Extract path from URI if provided (after "openfoodfacts://structure/")
        const structurePath = uri.replace("openfoodfacts://structure/", "").trim();
        const dirPath = structurePath || "."; // Default to root if no path specified
        // Get directory contents with their types
        const contents = await getDirectoryContents(dirPath);
        // Build a hierarchical structure
        const structure = {
            path: dirPath,
            contents: contents.split("\n").map(line => {
                const match = line.match(/^(.+)\s\((.+)\)$/);
                if (!match)
                    return { name: line, type: "unknown" };
                const [, name, type] = match;
                return {
                    name,
                    type,
                    uri: `openfoodfacts://structure/${dirPath === "." ? "" : dirPath + "/"}${name}`
                };
            })
        };
        return {
            contents: [{
                    uri,
                    text: JSON.stringify(structure, null, 2),
                    metadata: {
                        contentType: "application/json"
                    }
                }]
        };
    }
    catch (error) {
        return {
            contents: [{
                    uri,
                    text: `Error retrieving project structure: ${error instanceof Error ? error.message : String(error)}`,
                    isError: true
                }]
        };
    }
}
