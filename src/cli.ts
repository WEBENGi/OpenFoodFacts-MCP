#!/usr/bin/env node

import { startServer } from './server.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options: Record<string, any> = {};

// Parse command line arguments in format --key=value or --flag
for (const arg of args) {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    options[key] = value === undefined ? true : value;
  }
}

// Set transport mode from command line if specified
if (options.transport) {
  process.env.TRANSPORT = options.transport;
}

// Set port from command line if specified
if (options.port) {
  process.env.PORT = options.port;
}

// Set developer mode from command line flag
const developerMode = !!options.developer;
if (developerMode) {
  process.env.DEVELOPER_MODE = 'true'; 
}

console.log('Starting Open Food Facts MCP server...');
if (options.transport) {
  console.log(`Transport mode: ${options.transport}`);
}

console.log(`Mode: ${developerMode ? 'Developer (all tools enabled)' : 'Standard (core tools only)'}`);

console.log('Enabled capabilities:');
console.log('- Resources: Food product data access');
console.log('- Tools: Food product search and information');
console.log('- Prompts: Food product analysis templates');
console.log('- Sampling: AI-powered food product analysis');
console.log('- Roots: Resource boundary management');
if (developerMode) {
  console.log('- Developer Tools: Code analysis, PR generation, and contributor assistance');
}

startServer(developerMode).catch((error: Error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});