import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleProjectStructure } from '../../src/resources/project-structure';
import { getDirectoryContents } from '../../src/utils/file-utils';

// Mock the file-utils module
vi.mock('../../src/utils/file-utils', () => ({
  getDirectoryContents: vi.fn()
}));

describe('Project Structure Resource Handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return directory contents for a valid path', async () => {
    // Setup mock
    const mockDirectoryContents = 'file1.txt (file)\nfolder1 (directory)';
    vi.mocked(getDirectoryContents).mockResolvedValue(mockDirectoryContents);

    // Create test URI and URL
    const uri = 'openfoodfacts://structure/lib';
    const url = new URL(uri);

    // Call the function
    const result = await handleProjectStructure(uri, url);

    // Verify mocks were called with the correct path
    expect(getDirectoryContents).toHaveBeenCalledWith('lib');

    // Verify the result
    expect(result).toEqual({
      contents: [{
        uri: 'openfoodfacts://structure/lib',
        text: 'Directory lib:\nfile1.txt (file)\nfolder1 (directory)'
      }]
    });
  });

  it('should return directory contents for the root path', async () => {
    // Setup mock
    const mockDirectoryContents = 'folder1 (directory)\nfolder2 (directory)';
    vi.mocked(getDirectoryContents).mockResolvedValue(mockDirectoryContents);

    // Create test URI and URL with root path
    const uri = 'openfoodfacts://structure/';
    const url = new URL(uri);

    // Call the function
    const result = await handleProjectStructure(uri, url);

    // Verify mocks were called with empty string for root
    expect(getDirectoryContents).toHaveBeenCalledWith('');

    // Verify the result
    expect(result).toEqual({
      contents: [{
        uri: 'openfoodfacts://structure/',
        text: 'Directory root:\nfolder1 (directory)\nfolder2 (directory)'
      }]
    });
  });

  it('should handle errors from getDirectoryContents', async () => {
    // Setup mock to throw an error
    const errorMessage = 'Directory not found';
    vi.mocked(getDirectoryContents).mockRejectedValue(new Error(errorMessage));

    // Create test URI and URL
    const uri = 'openfoodfacts://structure/nonexistent';
    const url = new URL(uri);

    // Call the function
    const result = await handleProjectStructure(uri, url);

    // Verify the result contains error information
    expect(result).toEqual({
      contents: [{
        uri: 'openfoodfacts://structure/nonexistent',
        text: `Error accessing directory: ${errorMessage}`,
        isError: true
      }]
    });
  });

  it('should handle unexpected errors', async () => {
    // Create test URI and URL
    const uri = 'invalid-uri';
    // This will throw an error when trying to create a URL
    
    // Call the function with a parameter that will cause an error
    const result = await handleProjectStructure(uri, null as any);

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