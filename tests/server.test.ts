/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startServer } from '../src/server';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { setupStdioTransport, setupHttpTransport } from '../src/transport/transports';
import { serverConfig } from '../src/config/server-config';
import { availableResources, routeResourceRequest } from '../src/resources/resource-registry';
import express from 'express';

// Mock dependencies
vi.mock('@modelcontextprotocol/sdk/server', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('@modelcontextprotocol/sdk/types', () => ({
  ListResourcesRequestSchema: 'LIST_RESOURCES',
  ReadResourceRequestSchema: 'READ_RESOURCE'
}));

vi.mock('./transport/transports', () => ({
  setupStdioTransport: vi.fn().mockResolvedValue(undefined),
  setupHttpTransport: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./config/server-config', () => ({
  serverConfig: {
    name: 'OpenFoodFactsServer',
    description: 'MCP Server for Open Food Facts',
    version: '1.0.0'
  }
}));

vi.mock('./resources/resource-registry', () => ({
  availableResources: ['resource1', 'resource2'],
  routeResourceRequest: vi.fn().mockResolvedValue({ contents: [] })
}));

vi.mock('express', () => vi.fn(() => ({
  // Mock express methods as needed
  use: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  listen: vi.fn()
})));

describe('Server', () => {
  // Save original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Reset env before each test
    process.env = { ...originalEnv };
    delete process.env.TRANSPORT;
  });

  afterEach(() => {
    // Restore env
    process.env = originalEnv;
  });

  it('should initialize server with config', async () => {
    // Call the function
    await startServer();

    // Verify Server was initialized with correct config
    expect(Server).toHaveBeenCalledWith(serverConfig, {
      capabilities: {
        resources: {}
      }
    });
  });

  it('should set up resource request handlers', async () => {
    // Call the function
    await startServer();

    // Get the mock server instance
    const mockServer = vi.mocked(Server).mock.instances[0];

    // Verify ListResources handler was registered
    expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
      ListResourcesRequestSchema,
      expect.any(Function)
    );

    // Verify ReadResource handler was registered
    expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
      ReadResourceRequestSchema,
      expect.any(Function)
    );
  });

  it('should initialize stdio transport when TRANSPORT=stdio', async () => {
    // Set env for stdio
    process.env.TRANSPORT = 'stdio';

    // Call the function
    await startServer();

    // Verify stdio transport was set up
    expect(setupStdioTransport).toHaveBeenCalled();

    // Verify HTTP transport was not set up
    expect(setupHttpTransport).not.toHaveBeenCalled();
  });

  it('should initialize HTTP transport by default', async () => {
    // Call the function without setting TRANSPORT env
    await startServer();

    // Verify express was created
    expect(express).toHaveBeenCalled();

    // Verify HTTP transport was set up
    expect(setupHttpTransport).toHaveBeenCalledWith(
      expect.any(Object), // server
      expect.any(Object)  // express app
    );

    // Verify stdio transport was not set up
    expect(setupStdioTransport).not.toHaveBeenCalled();
  });

  it('should correctly handle list resources request', async () => {
    // Get mock server instance
    const { setRequestHandler } = vi.mocked(Server).mock.results[0].value;

    // Start the server to register handlers
    await startServer();

    // Get the handler function that was registered for ListResources
    const listResourcesHandler = setRequestHandler.mock.calls.find(
      call => call[0] === ListResourcesRequestSchema
    )[1];

    // Call the handler directly
    const result = await listResourcesHandler({});

    // Verify result contains the available resources
    expect(result).toEqual({
      resources: availableResources
    });
  });

  it('should correctly handle read resource request', async () => {
    // Mock resource request response
    const mockResourceResponse = {
      contents: [{ uri: 'test-uri', text: 'test content' }]
    };
    vi.mocked(routeResourceRequest).mockResolvedValueOnce(mockResourceResponse);

    // Get mock server instance
    const { setRequestHandler } = vi.mocked(Server).mock.results[0].value;

    // Start the server to register handlers
    await startServer();

    // Get the handler function that was registered for ReadResource
    const readResourceHandler = setRequestHandler.mock.calls.find(
      call => call[0] === ReadResourceRequestSchema
    )[1];

    // Call the handler with a test request
    const testUri = 'openfoodfacts://test-resource';
    const result = await readResourceHandler({ params: { uri: testUri } });

    // Verify request was routed correctly
    expect(routeResourceRequest).toHaveBeenCalledWith(testUri);

    // Verify result matches the mock response
    expect(result).toEqual(mockResourceResponse);
  });
});