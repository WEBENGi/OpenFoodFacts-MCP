#!/bin/bash

# Start-MCP-Server Script for Open Food Facts
# This script helps you start the Model Context Protocol server for the Open Food Facts project

# Set environment variables
export PORT=28375

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Check if node modules are installed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build the server if not already built
if [ ! -d "dist" ]; then
  echo "Building the MCP server..."
  npm run build
fi

# Start the server
echo "Starting the Open Food Facts MCP Server in SSE transport mode on port $PORT..."
npm start