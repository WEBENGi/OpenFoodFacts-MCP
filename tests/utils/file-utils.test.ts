import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDirectoryContents, getFileContents, readJsonFile, findTaxonomyFile } from '../../src/utils/file-utils';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock the fs module
vi.mock('fs/promises');
vi.mock('path');

describe('File Utilities', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDirectoryContents', () => {
    it('should return directory contents', async () => {
      // Mock file system calls
      const mockStat = { isDirectory: () => true };
      const mockEntries = [
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'folder1', isDirectory: () => true }
      ];

      // Setup mocks
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);
      vi.mocked(fs.readdir).mockResolvedValue(mockEntries as any);
      vi.mocked(path.resolve).mockReturnValue('/mock/project/root/test-dir');

      // Call the function
      const result = await getDirectoryContents('test-dir');

      // Verify mocks were called correctly
      expect(path.resolve).toHaveBeenCalledWith('/mock/project/root', 'test-dir');
      expect(fs.stat).toHaveBeenCalledWith('/mock/project/root/test-dir');
      expect(fs.readdir).toHaveBeenCalledWith('/mock/project/root/test-dir', { withFileTypes: true });

      // Verify the result
      expect(result).toBe('file1.txt (file)\nfolder1 (directory)');
    });

    it('should throw an error if path is outside project root', async () => {
      // Setup mock to return a path outside project root
      vi.mocked(path.resolve).mockReturnValueOnce('/outside/project/root');

      // Verify error is thrown
      await expect(getDirectoryContents('../outside')).rejects.toThrow('Access denied');
    });

    it('should throw an error if path is not a directory', async () => {
      const mockStat = { isDirectory: () => false };
      
      // Setup mocks
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);
      vi.mocked(path.resolve).mockReturnValue('/mock/project/root/file.txt');

      // Verify error is thrown
      await expect(getDirectoryContents('file.txt')).rejects.toThrow('Not a directory');
    });
  });

  describe('getFileContents', () => {
    it('should return file contents with metadata', async () => {
      // Setup mocks
      const mockStat = { 
        isFile: () => true,
        size: 1024,
        mtime: new Date('2023-01-01')
      };
      const mockContent = 'file content';
      
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);
      vi.mocked(path.resolve).mockReturnValue('/mock/project/root/test-file.txt');
      vi.mocked(path.basename).mockReturnValue('test-file.txt');
      vi.mocked(path.extname).mockReturnValue('.txt');

      // Call the function
      const result = await getFileContents('test-file.txt');

      // Verify mocks were called correctly
      expect(path.resolve).toHaveBeenCalledWith('/mock/project/root', 'test-file.txt');
      expect(fs.stat).toHaveBeenCalledWith('/mock/project/root/test-file.txt');
      expect(fs.readFile).toHaveBeenCalledWith('/mock/project/root/test-file.txt', 'utf8');

      // Verify the result
      expect(result).toEqual({
        content: 'file content',
        metadata: {
          filename: 'test-file.txt',
          extension: '.txt',
          size: 1024,
          lastModified: new Date('2023-01-01').toISOString()
        }
      });
    });

    it('should throw an error if path is outside project root', async () => {
      // Setup mock to return a path outside project root
      vi.mocked(path.resolve).mockReturnValueOnce('/outside/project/root');

      // Verify error is thrown
      await expect(getFileContents('../outside')).rejects.toThrow('Access denied');
    });

    it('should throw an error if path is not a file', async () => {
      const mockStat = { isFile: () => false };
      
      // Setup mocks
      vi.mocked(fs.stat).mockResolvedValue(mockStat as any);
      vi.mocked(path.resolve).mockReturnValue('/mock/project/root/folder');

      // Verify error is thrown
      await expect(getFileContents('folder')).rejects.toThrow('Not a file');
    });
  });

  describe('readJsonFile', () => {
    it('should return parsed JSON when file exists', async () => {
      const mockJson = '{"name":"test","value":123}';
      const mockDefaultValue = { default: true };
      
      // Setup mocks
      vi.mocked(fs.readFile).mockResolvedValue(mockJson);
      vi.mocked(path.resolve).mockReturnValue('/mock/project/root/test.json');

      // Call the function
      const result = await readJsonFile('test.json', mockDefaultValue);

      // Verify mocks were called correctly
      expect(path.resolve).toHaveBeenCalledWith('/mock/project/root', 'test.json');
      expect(fs.readFile).toHaveBeenCalledWith('/mock/project/root/test.json', 'utf8');

      // Verify the result
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should return default value when file does not exist', async () => {
      const mockDefaultValue = { default: true };
      
      // Setup mocks
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      // Call the function
      const result = await readJsonFile('nonexistent.json', mockDefaultValue);

      // Verify the result is the default value
      expect(result).toEqual(mockDefaultValue);
    });
  });

  describe('findTaxonomyFile', () => {
    it('should find and return taxonomy content if file exists', async () => {
      const mockContent = 'taxonomy content';
      const taxonomyId = 'categories';
      
      // Setup mocks for the first path
      vi.mocked(fs.stat).mockImplementation(async (path) => {
        // Only succeed for the first path
        if (path === '/mock/project/root/taxonomies/categories/taxonomy.txt') {
          return { isFile: () => true } as any;
        }
        throw new Error('File not found');
      });
      
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);
      
      // Call the function
      const result = await findTaxonomyFile(taxonomyId);

      // Verify mocks were called correctly
      expect(fs.stat).toHaveBeenCalledWith('/mock/project/root/taxonomies/categories/taxonomy.txt');
      expect(fs.readFile).toHaveBeenCalledWith('/mock/project/root/taxonomies/categories/taxonomy.txt', 'utf8');

      // Verify the result
      expect(result).toEqual({
        content: 'taxonomy content',
        path: 'taxonomies/categories/taxonomy.txt'
      });
    });

    it('should try multiple paths and return null if taxonomy not found', async () => {
      const taxonomyId = 'nonexistent';
      
      // Setup mocks to fail for all paths
      vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'));
      
      // Call the function
      const result = await findTaxonomyFile(taxonomyId);

      // Verify the result
      expect(result).toBeNull();
    });
  });
});