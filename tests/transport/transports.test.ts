/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupStdioTransport, setupHttpTransport } from '../../src/transport/transports';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

// Mock dependencies
vi.mock('@modelcontextprotocol/sdk/server', () => ({
  Server: vi.fn().mockImplementation((config) => ({
    setStdioTransport: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('express', () => {
  const mockApp = {
    use: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    listen: vi.fn().mockImplementation((port, callback) => {
      if (callback) callback();
      return { close: vi.fn() };
    })
  };
  return vi.fn(() => mockApp);
});

vi.mock('cors', () => vi.fn().mockReturnValue('corsMiddleware'));
vi.mock('body-parser', () => ({
  json: vi.fn().mockReturnValue('jsonMiddleware')
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('{"key": "value"}'))
}));

describe('Transport Setup', () => {
  let mockServer: any;
  let mockApp: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockServer = new Server({ name: 'test-server', version: '1.0.0' });
    mockApp = express();
  });

  describe('setupStdioTransport', () => {
    it('should set up stdio transport for the server', async () => {
      await setupStdioTransport(mockServer);

      expect(mockServer.setStdioTransport).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalled();
    });
  });

  describe('setupHttpTransport', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      // Default port if not set in env
      process.env.PORT = '3000';
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should set up HTTP transport with correct middleware', async () => {
      await setupHttpTransport(mockServer, mockApp);

      // Verify middleware was set up
      expect(mockApp.use).toHaveBeenCalledWith('corsMiddleware');
      expect(mockApp.use).toHaveBeenCalledWith('jsonMiddleware');
      expect(cors).toHaveBeenCalled();
      expect(bodyParser.json).toHaveBeenCalled();
    });

    it('should set up a health check endpoint', async () => {
      await setupHttpTransport(mockServer, mockApp);

      // Verify health check endpoint was set up
      expect(mockApp.get).toHaveBeenCalledWith(
        '/health',
        expect.any(Function)
      );

      // Get the health check handler
      const healthHandler = mockApp.get.mock.calls.find(
        call => call[0] === '/health'
      )[1];

      // Create mock response object to test handler
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      // Call the health check handler
      healthHandler({}, mockRes);

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ok' });
    });

    it('should listen on the port specified in environment variables', async () => {
      process.env.PORT = '8080';

      await setupHttpTransport(mockServer, mockApp);

      expect(mockApp.listen).toHaveBeenCalledWith(
        8080,
        expect.any(Function)
      );
    });

    it('should use default port 3000 if PORT env var is not set', async () => {
      delete process.env.PORT;

      await setupHttpTransport(mockServer, mockApp);

      expect(mockApp.listen).toHaveBeenCalledWith(
        3000,
        expect.any(Function)
      );
    });

    it('should set up an MCP endpoint that forwards to the server', async () => {
      await setupHttpTransport(mockServer, mockApp);

      // Verify MCP endpoint was set up
      expect(mockApp.post).toHaveBeenCalledWith(
        '/mcp',
        expect.any(Function)
      );

      // Get the MCP handler
      const mcpHandler = mockApp.post.mock.calls.find(
        call => call[0] === '/mcp'
      )[1];

      // Create mock request and response objects
      const mockReq = {
        body: { method: 'test-method', params: {} }
      };
      const mockRes = {
        json: vi.fn()
      };

      // Mock the server connection's handleRequest method
      const mockConnection = {
        handleRequest: vi.fn().mockResolvedValue({ result: 'test-result' })
      };
      mockServer.connect.mockResolvedValue(mockConnection);

      // Connect the server to get the connection
      await mockServer.connect();

      // Call the MCP handler
      await mcpHandler(mockReq, mockRes);

      // Verify handleRequest was called with correct params
      expect(mockConnection.handleRequest).toHaveBeenCalledWith(
        mockReq.body.method,
        mockReq.body.params
      );

      // Verify response was sent
      expect(mockRes.json).toHaveBeenCalledWith({ result: 'test-result' });
    });
  });
});