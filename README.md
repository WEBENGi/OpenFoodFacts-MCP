# Open Food Facts MCP Server

This is a Model Context Protocol (MCP) server implementation for the Open Food Facts project. It provides contextual information about food products to AI-powered development tools using the official [Model Context Protocol](https://modelcontextprotocol.io/) specification.

## Overview

### What is the Model Context Protocol?

The Model Context Protocol (MCP) is a standardized way for AI-powered development tools to communicate with code repositories and other data sources. It allows AI tools to understand codebases better by providing structured access to:

- File content and project structure
- Code relationships and architectural insights
- Domain-specific knowledge and documentation
- Interactive tools for code exploration

### How it Benefits Open Food Facts

This MCP server enables:

1. **Enhanced AI Assistance**: LLMs can provide more accurate information about food products
2. **Developer Productivity**: Automated assistance for common Open Food Facts development tasks
3. **Knowledge Sharing**: Better understanding of the codebase for contributors
4. **User Support**: Improved answers to nutrition and product-related questions

## Server Modes

The MCP server supports two operational modes:

### Standard Mode

The default mode focused on food product information for general users:

- Access to food product tools only
- Limited resources focused on product information
- Simplified interface for non-developer users
- Optimized for nutritional analysis and food product questions

### Developer Mode

An enhanced mode with additional tools for Open Food Facts contributors:

- All standard food product tools
- GitHub repository analysis tools
- Codebase navigation and analysis tools
- Development-specific resources and prompts
- Technical documentation and guides

## Available Tools

### Food Product Tools (Available in Both Modes)

- **searchProducts**: Search for products in the Open Food Facts database by name, brand, category, or other keywords
- **getProductByBarcode**: Get detailed information about a product by its barcode (EAN, UPC, etc.)
- **analyzeProduct**: Analyze a product from the Open Food Facts database using AI
- **compareProducts**: Compare two products from the Open Food Facts database using AI
- **suggestRecipes**: Get AI-powered recipe suggestions using a product from the Open Food Facts database

### GitHub Repository Tools (Developer Mode Only)

- **analyzeGitHubIssue**: Analyze a specific GitHub issue from Open Food Facts repositories using AI
- **analyzeGitHubIssuesByLabel**: Analyze multiple GitHub issues with a specific label from Open Food Facts repositories
- **createGitHubIssueRoadmap**: Generate a prioritized roadmap based on open GitHub issues from Open Food Facts repositories

### Developer Tools (Developer Mode Only)

- **analyzeRepository**: Analyze the structure and organization of Open Food Facts repositories
- **explainCode**: Get detailed explanations of code segments in the Open Food Facts codebase
- **matchIssues**: Find related issues and pull requests for a specific problem
- **generatePR**: Generate a pull request template for a code change
- **generateTests**: Create test cases for a function or module
- **gitHelper**: Get assistance with git commands for Open Food Facts development

## Getting Started

### Prerequisites

- Node.js (v16.x or higher)
- npm or yarn
- Access to the Open Food Facts API (no authentication required)

### Installation

1. Clone the repository or navigate to the MCP server directory:

```bash
cd mcp-server
```

2. Install dependencies:

```bash
npm install
```

3. Build the server:

```bash
npm run build
```

4. Start the server:

**Standard Mode (default):**
```bash
npm start
# or
node dist/cli.js
```

**Developer Mode:**
```bash
npm start -- --developer
# or
node dist/cli.js --developer
```

## VS Code Integration

### Setting Up MCP in VS Code

1. Install the "Model Context Protocol" extension for VS Code

2. Create or update `.vscode/mcp.json` with the appropriate configuration:

**For Standard Users:**

```json
{
    "servers": {
        "openfoodfacts-standard": {
            "command": "node",
            "args": [
                "${workspaceFolder}/mcp-server/dist/cli.js"
            ],
            "env": {
                "TRANSPORT": "stdio"
            },
            "description": "Standard mode with food product tools only"
        }
    },
    "defaultServer": "openfoodfacts-standard"
}
```

**For Developers:**

```json
{
    "servers": {
        "openfoodfacts-developer": {
            "command": "node",
            "args": [
                "${workspaceFolder}/mcp-server/dist/cli.js",
                "--developer"
            ],
            "env": {
                "TRANSPORT": "stdio"
            },
            "description": "Developer mode with all tools including GitHub and code analysis"
        }
    },
    "defaultServer": "openfoodfacts-developer"
}
```

3. Use the "MCP: Connect to Server" command in VS Code and select your preferred server mode

## Example Tool Prompts

Below are example prompts you can use with any AI assistant to trigger specific MCP tools. These show natural ways to phrase requests to access each tool's functionality.

### Standard Mode Tool Examples

#### searchProducts
- "Search for chocolate cereals in the Open Food Facts database"
- "Find products that contain almond milk"
- "Look for organic yogurt products in Open Food Facts"

#### getProductByBarcode
- "Get information about the product with barcode 3017620422003"
- "What's in the product with EAN 5000159407236?"
- "Show nutritional data for barcode 8076809513326"

#### analyzeProduct
- "Can you analyze Nutella nutritionally?"
- "Analyze Cheerios cereal and tell me if it's healthy"
- "Give me an analysis of the ingredients in Oreo cookies"

#### compareProducts
- "Compare Nutella and Nocciolata"
- "Which is healthier: Coke or Pepsi?"
- "Compare almond milk and soy milk nutritionally"

#### suggestRecipes
- "What can I make with Greek yogurt?"
- "Suggest some recipes using chickpeas"
- "Give me recipe ideas for quinoa"

### Developer Mode Tool Examples

#### analyzeGitHubIssue
- "Analyze GitHub issue #1234 in the openfoodfacts-server repository"
- "What's the status of issue #876 in openfoodfacts-server?"
- "Give me a summary of GitHub issue #2468"

#### analyzeGitHubIssuesByLabel
- "Analyze issues with the 'bug' label in the openfoodfacts-server repository"
- "What are the common themes in issues labeled 'enhancement'?"
- "Summarize all issues with the 'documentation' label"

#### createGitHubIssueRoadmap
- "Create a roadmap for the openfoodfacts-server repository"
- "Generate a short-term roadmap for the mobile app improvements"
- "What should be prioritized for the product search functionality?"

#### analyzeRepository
- "Analyze the structure of the Open Food Facts repository"
- "Give me an overview of the codebase architecture"
- "What's the overall design of the Open Food Facts codebase?"

#### explainCode
- "Explain how the product search functionality works"
- "How does the taxonomy system work in Open Food Facts?"
- "Explain the code for handling product images"

#### matchIssues
- "Find GitHub issues related to product image processing"
- "Are there any issues about barcode scanning problems?"
- "Match issues about the product search functionality"

#### generatePR
- "Generate a PR template for fixing the product search endpoint"
- "I need a pull request for adding a new field to the product schema"
- "Create a PR for improving error handling"

#### generateTests
- "Generate tests for the product search functionality"
- "Create unit tests for the barcode validation function"
- "I need test cases for the user authentication flow"

#### gitHelper
- "How do I create a new branch for a feature in Open Food Facts?"
- "What's the proper git workflow for contributing to this project?"
- "What git commands should I use to update my fork?"

## LLM Connection Methods

You can connect various AI assistants to your Open Food Facts MCP server:

### VS Code Extension with GitHub Copilot

1. Install the MCP extension for VS Code
2. Configure in `.vscode/mcp.json` as shown above
3. Connect via the VS Code MCP extension UI

### Claude Desktop

1. Start your MCP server using HTTP/SSE transport mode:
```bash
PORT=28375 npm start
# For developer mode:
PORT=28375 npm start -- --developer
```

2. In Claude Desktop, connect to the MCP server at `http://localhost:28375/sse`

### Other AI Tools (Cursor AI, WindsurfAI, etc.)

1. Start your MCP server in your preferred mode
2. Configure the AI tool to connect to your local MCP server
3. Use the example prompts above to access specific tools

## Resources and Prompts

The MCP server provides different sets of resources and prompts based on the active mode:

### Standard Mode Resources

- Product information
- Database schema
- API documentation
- Food categories taxonomy

### Developer Mode Additional Resources

- Project structure navigation
- Code patterns and conventions
- File organization guides
- Development templates

### Prompts

The server offers pre-configured prompts for common tasks:

**Standard Mode:**
- Analyze a food product
- Compare products
- Check for additives

**Developer Mode (Additional):**
- Debug Perl code
- Explain codebase structure
- Implement features
- Optimize MongoDB queries
- Create unit tests
- Review pull requests
- And many more development-focused prompts

## Using MCP Tools Effectively

For maximum effectiveness when using the MCP tools:

### Product Information (Standard Mode)

1. **Finding Products**:
   - Use `searchProducts` to find products by name, brand, or category
   - Use `getProductByBarcode` when you have a specific product barcode

2. **Analysis and Comparison**:
   - Use `analyzeProduct` for nutritional insights and health analysis
   - Use `compareProducts` to directly compare two products
   - Use `suggestRecipes` to get cooking ideas based on ingredients

### Development Tasks (Developer Mode)

1. **Understanding the Codebase**:
   - Use `analyzeRepository` to grasp the overall structure
   - Use `explainCode` for detailed code explanations
   
2. **Issue Management**:
   - Use `analyzeGitHubIssue` for understanding specific issues
   - Use `analyzeGitHubIssuesByLabel` for identifying patterns across issues
   - Use `matchIssues` to find related issues for a problem
   
3. **Contributing Code**:
   - Use `generatePR` to create PR templates
   - Use `generateTests` to add test coverage
   - Use `gitHelper` for git workflow guidance

## Example User Workflows

### Standard Mode Workflow Examples

1. **Nutritional Analysis**:
   ```
   User: "Is Nutella healthy?"
   MCP Flow:
   1. searchProducts to find Nutella
   2. getProductByBarcode with the found barcode
   3. analyzeProduct for nutritional assessment
   ```

2. **Product Comparison**:
   ```
   User: "Which is healthier, Nutella or Nocciolata?"
   MCP Flow:
   1. searchProducts for each product
   2. compareProducts using found barcodes
   3. Structured comparison of nutritional values
   ```

3. **Recipe Ideas**:
   ```
   User: "What can I make with Greek yogurt?"
   MCP Flow:
   1. searchProducts to find Greek yogurt
   2. suggestRecipes with the product
   ```

### Developer Mode Workflow Examples

1. **Understanding the Codebase**:
   ```
   User: "How is the product schema organized?"
   MCP Flow:
   1. explainCode with focus on schema
   2. analyzeRepository for related components
   ```

2. **Fixing Issues**:
   ```
   User: "Help me debug this Perl error with product validation"
   MCP Flow:
   1. matchIssues to find similar problems
   2. explainCode to understand the validation logic
   ```

3. **Contributing**:
   ```
   User: "I want to add a new field to the product schema"
   MCP Flow:
   1. explainCode to examine schema structure
   2. generatePR to create a PR template
   3. generateTests for the new field
   ```

## Implementation Details

### Server Architecture

The MCP server is structured as follows:

- `src/cli.ts`: Command-line interface with developer mode flag parsing
- `src/server.ts`: Core server implementation with mode-specific configuration
- `src/tools/`: Contains all tool implementations
  - `src/tools/index.ts`: Central registry that conditionally registers tools based on mode
  - `src/tools/product-search.ts`: Product search and barcode lookup tools
  - `src/tools/ai-analysis-tool.ts`: AI-powered product analysis tools
  - `src/tools/github-issues-tool.ts`: GitHub issue analysis tools (developer mode)
- `src/resources/`: Resource handlers and registry with mode filtering
- `src/prompts/`: Prompt definitions and handlers with mode filtering
- `src/sampling/`: Services for interacting with AI models
- `src/transport/`: Transport layer implementations (stdio, HTTP/SSE)

### Command-Line Arguments

The server supports the following command-line arguments:

- `--developer`: Enable developer mode with additional tools and resources
- `--transport=<type>`: Set the transport type (stdio, http)
- `--port=<number>`: Set the HTTP port for HTTP/SSE transport
- `--help`: Show help information

## Debugging and Troubleshooting

### Common Issues

1. **Connection Problems**:
   - Check that the server is running with the correct transport mode
   - Verify port availability when using HTTP/SSE transport
   - Ensure VS Code extension is properly configured

2. **Missing Tools in Standard Mode**:
   - Developer tools require `--developer` flag
   - Check if you started the server in standard mode

3. **GitHub API Rate Limits**:
   - The server uses unauthenticated GitHub API calls which have rate limits
   - Consider connecting to GitHub with authentication for higher limits

### Logs

The server outputs logs to help diagnose issues:

- Standard log output shows connection information and errors
- Server mode and enabled capabilities are displayed at startup
- Tool invocation and error details are logged

## Contributing

Contributions are welcome! Here are some ways you can improve the MCP server:

1. Add more specialized tools for Open Food Facts-specific functionality
2. Enhance the existing tools with more detailed information
3. Improve error handling and validation
4. Add support for more data sources

### Development Workflow

1. Make changes in the `src/` directory
2. Build with `npm run build`
3. Test both modes: standard and developer
4. Submit a PR with clear documentation of your changes

## License

This project is licensed under the GNU Affero General Public License, the same license as the Open Food Facts project.