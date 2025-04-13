import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { logger } from '../transport/transports.js';

// Convert callback-based functions to Promise-based
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const execFilePromise = promisify(execFile);

// Interface for a repository structure entry
export interface RepoStructureEntry {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: RepoStructureEntry[];
  language?: string;
}

// Interface for file content with context
export interface FileWithContext {
  path: string;
  content: string;
  lineCount: number;
  language?: string;
}

// Interface representing a code explanation result
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
export async function analyzeRepoStructure(
  repoPath: string,
  maxDepth: number = 2,
  excludePatterns: string[] = ["node_modules", ".git", "dist", "build"]
): Promise<RepoStructureEntry> {
  // Validate the repository path
  try {
    const repoStats = await stat(repoPath);
    if (!repoStats.isDirectory()) {
      throw new Error(`'${repoPath}' is not a directory`);
    }
  } catch (error) {
    logger.error(`Error accessing repository path: ${repoPath}`, error);
    throw new Error(`Failed to access repository at '${repoPath}': ${error instanceof Error ? error.message : String(error)}`);
  }

  // Recursively analyze the repository structure
  async function analyzeDirectory(dirPath: string, depth: number): Promise<RepoStructureEntry> {
    const relativePath = path.relative(repoPath, dirPath);
    const dirName = path.basename(dirPath);

    // Skip excluded directories
    if (excludePatterns.some(pattern => dirName.includes(pattern))) {
      return {
        path: relativePath || '.', // Use '.' for the root directory
        type: 'directory'
      };
    }

    // Get directory entries
    const entries = await readdir(dirPath);
    const children: RepoStructureEntry[] = [];

    // Process each entry (file or directory)
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);
      const entryStat = await stat(entryPath);

      // Skip excluded entries
      if (excludePatterns.some(pattern => entry.includes(pattern))) {
        continue;
      }

      if (entryStat.isDirectory()) {
        // If within max depth, recursively process subdirectories
        if (depth < maxDepth) {
          const subdirInfo = await analyzeDirectory(entryPath, depth + 1);
          children.push(subdirInfo);
        } else {
          // Just add directory name without recursion if we've reached max depth
          children.push({
            path: path.relative(repoPath, entryPath),
            type: 'directory'
          });
        }
      } else if (entryStat.isFile()) {
        // Determine the language based on file extension
        const fileLanguage = getFileLanguage(entry);
        
        // Add file information
        children.push({
          path: path.relative(repoPath, entryPath),
          type: 'file',
          size: entryStat.size,
          language: fileLanguage
        });
      }
    }

    // Sort children: directories first, then files
    children.sort((a, b) => {
      if (a.type === b.type) {
        return a.path.localeCompare(b.path);
      }
      return a.type === 'directory' ? -1 : 1;
    });

    return {
      path: relativePath || '.', // Use '.' for the root directory
      type: 'directory',
      children
    };
  }

  // Start analysis from the repo root
  return await analyzeDirectory(repoPath, 0);
}

/**
 * Finds important files in a repository based on common patterns
 * @param repoPath Path to the repository root
 * @returns List of important files
 */
export async function findImportantFiles(repoPath: string): Promise<string[]> {
  const importantFilePatterns: (string | RegExp)[] = [
    'README.md', 'readme.md', // Documentation
    'CONTRIBUTING.md', 'contributing.md', // Contribution guidelines
    'LICENSE', 'license', // License information
    'package.json', 'setup.py', 'requirements.txt', 'Gemfile', 'build.gradle', // Package definitions
    'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', // Docker configuration
    '.gitignore', '.travis.yml', '.github/workflows', // CI/CD and git config
    'main.ts', 'main.js', 'index.ts', 'index.js', 'app.ts', 'app.js', // Entry points
    'tsconfig.json', 'webpack.config.js', 'rollup.config.js', // Build configuration
  ];

  const importantFiles: string[] = [];
  
  // Helper function to search for files recursively
  async function searchFiles(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const entryStat = await stat(entryPath);
        
        // Skip node_modules, .git, and other large directories
        if (entryStat.isDirectory()) {
          if (!['.git', 'node_modules', 'dist', 'build'].includes(entry)) {
            await searchFiles(entryPath);
          }
          continue;
        }

        // Check if the file matches important patterns
        if (importantFilePatterns.some(pattern => {
          return typeof pattern === 'string' 
            ? entry.toLowerCase() === pattern.toLowerCase()
            : pattern instanceof RegExp && pattern.test(entry);
        })) {
          importantFiles.push(path.relative(repoPath, entryPath));
        }
      }
    } catch (error) {
      logger.error(`Error searching directory ${dirPath}`, error);
    }
  }

  await searchFiles(repoPath);
  return importantFiles;
}

/**
 * Reads a specific file with context
 * @param repoPath Path to the repository root
 * @param filePath Relative path to the file within the repository
 * @returns File content with context information
 */
export async function readFileWithContext(repoPath: string, filePath: string): Promise<FileWithContext> {
  const fullPath = path.join(repoPath, filePath);
  
  try {
    const fileContent = await readFile(fullPath, 'utf-8');
    const lineCount = fileContent.split('\n').length;
    const language = getFileLanguage(filePath);
    
    return {
      path: filePath,
      content: fileContent,
      lineCount,
      language
    };
  } catch (error) {
    logger.error(`Error reading file: ${fullPath}`, error);
    throw new Error(`Failed to read file '${filePath}': ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Determines the programming language based on file extension
 * @param filePath Path to the file
 * @returns Language identifier or undefined if unknown
 */
function getFileLanguage(filePath: string): string | undefined {
  const extension = path.extname(filePath).toLowerCase();
  
  // Map file extensions to languages
  const languageMap: Record<string, string> = {
    '.js': 'JavaScript',
    '.ts': 'TypeScript',
    '.jsx': 'JavaScript (React)',
    '.tsx': 'TypeScript (React)',
    '.py': 'Python',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.go': 'Go',
    '.php': 'PHP',
    '.cs': 'C#',
    '.cpp': 'C++',
    '.c': 'C',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.yml': 'YAML',
    '.yaml': 'YAML',
    '.xml': 'XML',
    '.sh': 'Shell',
    '.bash': 'Bash',
    '.sql': 'SQL',
    '.rs': 'Rust',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.pl': 'Perl',
    '.pm': 'Perl Module'
  };

  return languageMap[extension];
}

/**
 * Estimates the primary language(s) used in the repository
 * @param repoPath Path to the repository root
 * @returns Object mapping languages to line counts
 */
export async function estimateRepoLanguages(repoPath: string): Promise<Record<string, number>> {
  const languages: Record<string, number> = {};
  
  // Helper function to count lines by language
  async function countLinesInDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const entryStat = await stat(entryPath);
        
        // Skip node_modules, .git, and other common excluded directories
        if (entryStat.isDirectory()) {
          if (!['.git', 'node_modules', 'dist', 'build'].includes(entry)) {
            await countLinesInDirectory(entryPath);
          }
          continue;
        }

        // Get language for the file
        const language = getFileLanguage(entryPath);
        if (!language) continue;
        
        try {
          const fileContent = await readFile(entryPath, 'utf-8');
          const lineCount = fileContent.split('\n').length;
          
          // Update language count
          languages[language] = (languages[language] || 0) + lineCount;
        } catch (error) {
          // Skip files we can't read
          logger.error(`Error reading file for language analysis: ${entryPath}`, error);
        }
      }
    } catch (error) {
      logger.error(`Error analyzing directory for languages: ${dirPath}`, error);
    }
  }

  await countLinesInDirectory(repoPath);
  return languages;
}

/**
 * Searches for a pattern in the repository
 * @param repoPath Path to the repository root
 * @param pattern The pattern to search for
 * @returns Array of files containing the pattern
 */
export async function searchInRepo(repoPath: string, pattern: string): Promise<string[]> {
  try {
    // Use grep to search for the pattern
    const { stdout } = await execFilePromise('grep', [
      '-r',              // Recursive search
      '--include=*.{js,ts,py,java,rb,php,c,cpp,h,hpp,cs,go}', // Limit to code files
      '-l',              // Only show file names
      pattern,           // The search pattern
      repoPath           // Directory to search
    ]);
    
    // Convert results to relative paths
    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(filePath => path.relative(repoPath, filePath));
  } catch (error) {
    // grep returns error code 1 when no matches are found
    if ((error as any).code === 1) {
      return [];
    }
    
    logger.error(`Error searching repository: ${repoPath}`, error);
    throw new Error(`Failed to search repository: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets information about dependencies from package files
 * @param repoPath Path to the repository root
 * @returns Object containing dependency information
 */
export async function getDependencyInfo(repoPath: string): Promise<Record<string, any>> {
  const dependencyInfo: Record<string, any> = {};
  
  // Check for package.json (Node.js projects)
  try {
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
      dependencyInfo.nodejs = {
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {}
      };
    }
  } catch (error) {
    logger.error('Error reading package.json', error);
  }
  
  // Check for requirements.txt (Python projects)
  try {
    const requirementsPath = path.join(repoPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      const requirements = await readFile(requirementsPath, 'utf-8');
      dependencyInfo.python = {
        requirements: requirements
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'))
      };
    }
  } catch (error) {
    logger.error('Error reading requirements.txt', error);
  }
  
  // Check for composer.json (PHP projects)
  try {
    const composerPath = path.join(repoPath, 'composer.json');
    if (fs.existsSync(composerPath)) {
      const composer = JSON.parse(await readFile(composerPath, 'utf-8'));
      dependencyInfo.php = {
        dependencies: composer.require || {},
        devDependencies: composer['require-dev'] || {}
      };
    }
  } catch (error) {
    logger.error('Error reading composer.json', error);
  }
  
  return dependencyInfo;
}

/**
 * Analyzes a codebase using AI sampling to provide insights
 * @param repoPath Path to the repository root
 * @param repoStructure Repository structure information
 * @param importantFiles List of important files in the repository
 * @param languageUsage Language usage statistics
 * @param dependencies Project dependencies
 * @returns AI-generated analysis of the codebase
 */
export async function generateCodebaseExplanation(
  repoPath: string,
  repoStructure: RepoStructureEntry,
  importantFiles: string[],
  languageUsage: Record<string, number>,
  dependencies: Record<string, any>
): Promise<CodeExplanationResult> {
  // Get content of the most important files for context
  const fileContents: Record<string, string> = {};
  
  // Prioritize README and other documentation files
  const docFiles = importantFiles.filter(file => 
    ['README.md', 'readme.md', 'CONTRIBUTING.md', 'contributing.md'].includes(path.basename(file))
  );
  
  // Get content of documentation files
  for (const file of docFiles) {
    try {
      fileContents[file] = await readFile(path.join(repoPath, file), 'utf-8');
    } catch (error) {
      logger.error(`Error reading file: ${file}`, error);
    }
  }
  
  // Determine primary technologies based on file extensions and dependencies
  const technologies: string[] = [];
  
  // Add languages with significant usage
  Object.entries(languageUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([lang]) => technologies.push(lang));
  
  // Add technologies from dependencies
  if (dependencies.nodejs) {
    technologies.push('Node.js');
    
    const deps = Object.keys(dependencies.nodejs.dependencies || {});
    if (deps.includes('react')) technologies.push('React');
    if (deps.includes('vue')) technologies.push('Vue.js');
    if (deps.includes('angular')) technologies.push('Angular');
    if (deps.includes('express')) technologies.push('Express');
    if (deps.includes('next')) technologies.push('Next.js');
  }
  
  if (dependencies.python) {
    technologies.push('Python');
    
    const reqs = dependencies.python.requirements || [];
    if (reqs.some((r: string) => r.includes('django'))) technologies.push('Django');
    if (reqs.some((r: string) => r.includes('flask'))) technologies.push('Flask');
    if (reqs.some((r: string) => r.includes('fastapi'))) technologies.push('FastAPI');
  }
  
  if (dependencies.php) {
    technologies.push('PHP');
    
    const deps = Object.keys(dependencies.php.dependencies || {});
    if (deps.some(d => d.includes('laravel'))) technologies.push('Laravel');
    if (deps.some(d => d.includes('symfony'))) technologies.push('Symfony');
  }
  
  // Look for common entry points in the repo
  const entryPoints: string[] = [];
  ['index.js', 'main.js', 'app.js', 'index.ts', 'main.ts', 'app.ts', 'app.py', 'main.py', 'index.php'].forEach(entry => {
    const foundEntries = importantFiles.filter(file => path.basename(file) === entry);
    entryPoints.push(...foundEntries);
  });

  // Generate example explanation
  // In a real implementation, this would be replaced with a call to an AI LLM
  const explanation: CodeExplanationResult = {
    overview: "This appears to be a web application built using multiple technologies.",
    keyComponents: [
      "Frontend components",
      "Backend server",
      "Database connectors",
      "API services"
    ],
    architectureDescription: "The codebase follows a client-server architecture with several independent modules.",
    entryPoints: entryPoints.length > 0 ? entryPoints : ["Entry points not automatically identified"],
    dataFlow: "Requests typically flow from the frontend to API endpoints, which process data and interact with databases.",
    technologiesUsed: technologies,
    gettingStarted: "To get started, ensure dependencies are installed and follow the setup instructions in the README.",
    recommendedReading: docFiles
  };
  
  return explanation;
}

// Helper utility function to format byte sizes in a human-readable way
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}