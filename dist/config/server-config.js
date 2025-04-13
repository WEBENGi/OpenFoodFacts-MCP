import path from "path";
// Server configuration
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 28375;
// Project root directory - the parent directory of the mcp-server folder
export const projectRoot = path.resolve(process.cwd(), "..");
// Server metadata
export const serverConfig = {
    name: "OpenFoodFacts-MCP",
    version: "1.0.0",
    description: "MCP server for Open Food Facts project"
};
