import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFileContent } from '../../src/resources/file-content';
import { getFileContents } from '../../src/utils/file-utils';

// Mock the file-utils module
vi.mock('../../src/utils/file-utils', () => ({
  getFileContent: vi.fn()
}));

describe('File Content Resource Handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return file content with metadata for a valid path', async () => {
    // Setup mock response
    const mockFileResponse = {
      content: 'file content goes here',
      metadata: {
        filename: 'test.txt',
        extension: '.txt',
        size: 1024,
        lastModified: '2023-01-01T00:00:00.000Z'
      }
    };
    
    vi.mocked(getFileContents).mockResolvedValue(mockFileResponse);

    // Create test URI and URL
    const uri = 'openfoodfacts://file/lib/test.txt';
    const url = new URL(uri);

    // Call the function
    const result = await handleFileContent(uri, url);

    // Verify mocks were called with correct parameters
    expect(getFileContents).toHaveBeenCalledWith('lib/test.txt');

    // Verify the result
    expect(result).toEqual({
      contents: [{
        uri: 'openfoodfacts://file/lib/test.txt',
        text: 'file content goes here',
        metadata: {
          filename: 'test.txt',
          extension: '.txt',
          size: 1024,
          lastModified: '2023-01-01T00:00:00.000Z'
        }
      }]
    });
  });

  it('should return an error if filepath is missing', async () => {
    // Create test URI and URL with no filepath
    const uri = 'openfoodfacts://file/';
    const url = new URL(uri);

    // Call the function
    const result = await handleFileContent(uri, url);

    // Verify getFileContent was not called
    expect(getFileContents).not.toHaveBeenCalled();

    // Verify the result contains error information
    expect(result).toEqual({
      contents: [{
        uri: 'openfoodfacts://file/',
        text: 'Error accessing file: Filepath parameter is required',
        isError: true
      }]
    });
  });

  it('should handle errors from getFileContent', async () => {
    // Setup mock to throw an error
    const errorMessage = 'File not found';
    vi.mocked(getFileContents).mockRejectedValue(new Error(errorMessage));

    // Create test URI and URL
    const uri = 'openfoodfacts://file/nonexistent.txt';
    const url = new URL(uri);

    // Call the function
    const result = await handleFileContent(uri, url);

    // Verify the result contains error information
    expect(result).toEqual({
      contents: [{
        uri: 'openfoodfacts://file/nonexistent.txt',
        text: `Error accessing file: ${errorMessage}`,
        isError: true
      }]
    });
  });

  it('should handle unexpected errors', async () => {
    // Create invalid inputs to generate an error
    const uri = 'invalid-uri';
    
    // Call the function with a parameter that will cause an error
    const result = await handleFileContent(uri, null as any);

    // Verify the result contains error information
    expect(result).toEqual({
      contents: [{
        uri: 'invalid-uri',
        text: expect.stringContaining('Error processing request:'),
        isError: true
      }]
    });
  });
});