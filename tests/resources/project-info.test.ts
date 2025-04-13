import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleProjectInfo } from '../../src/resources/project-info';
import fs from 'fs';
import { projectRoot } from '../../src/config/server-config';
import { readJsonFile } from '../../src/utils/file-utils';

// Mock dependencies
vi.mock('fs', () => ({
  default: {
    readdirSync: vi.fn()
  }
}));

vi.mock('../config/server-config', () => ({
  projectRoot: '/mock/project/root'
}));

vi.mock('../utils/file-utils', () => ({
  readJsonFile: vi.fn()
}));

describe('Project Info Resource Handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return project information with package data', async () => {
    // Mock package.json data
    const mockPackageInfo = {
      name: 'Open Food Facts Server',
      version: '1.0.0',
      description: 'Food products database for everyone'
    };
    
    // Mock directory structure
    const mockDirs = ['cgi', 'lib', 'templates', 'taxonomies'];
    const mockDirEnts = mockDirs.map(name => ({
      name,
      isDirectory: () => true
    }));
    
    // Set up mocks
    vi.mocked(readJsonFile).mockResolvedValue(mockPackageInfo);
    vi.mocked(fs.readdirSync).mockReturnValue(mockDirEnts as any);
    
    // Call function
    const uri = 'openfoodfacts://info';
    const result = await handleProjectInfo(uri);
    
    // Verify results
    expect(result).toEqual({
      contents: [{
        uri,
        text: expect.any(String),
        metadata: {
          contentType: 'application/json'
        }
      }]
    });
    
    // Parse returned JSON and verify
    const parsedInfo = JSON.parse(result.contents[0].text);
    expect(parsedInfo).toEqual({
      name: mockPackageInfo.name,
      version: mockPackageInfo.version,
      description: mockPackageInfo.description,
      mainDirectories: mockDirs,
      technologies: expect.arrayContaining([
        'Perl (core backend)',
        'MongoDB (database)'
      ])
    });
    
    // Verify mock was called
    expect(readJsonFile).toHaveBeenCalledWith('package.json', expect.any(Object));
    expect(fs.readdirSync).toHaveBeenCalledWith(projectRoot, { withFileTypes: true });
  });

  it('should use default package info when package.json read fails', async () => {
    // Mock error reading package.json
    vi.mocked(readJsonFile).mockRejectedValue(new Error('Cannot read package.json'));
    
    // Mock directory structure
    const mockDirs = ['data', 'html'];
    const mockDirEnts = mockDirs.map(name => ({
      name,
      isDirectory: () => true
    }));
    vi.mocked(fs.readdirSync).mockReturnValue(mockDirEnts as any);
    
    // Call function
    const uri = 'openfoodfacts://info';
    const result = await handleProjectInfo(uri);
    
    // Parse returned JSON and verify default values are used
    const parsedInfo = JSON.parse(result.contents[0].text);
    expect(parsedInfo).toEqual({
      name: 'Open Food Facts Server',
      version: 'Unknown',
      description: expect.stringContaining('food products database'),
      mainDirectories: mockDirs,
      technologies: expect.any(Array)
    });
  });

  it('should handle errors and return error response', async () => {
    // Mock filesystem error
    const mockError = new Error('Directory read error');
    vi.mocked(fs.readdirSync).mockImplementation(() => {
      throw mockError;
    });
    
    // Mock success reading package.json
    vi.mocked(readJsonFile).mockResolvedValue({
      name: 'Open Food Facts Server',
      version: '1.0.0',
      description: 'Test description'
    });
    
    // Call function
    const uri = 'openfoodfacts://info';
    const result = await handleProjectInfo(uri);
    
    // Verify error response
    expect(result).toEqual({
      contents: [{
        uri,
        text: expect.stringContaining('Error retrieving project info'),
        isError: true
      }]
    });
    expect(result.contents[0].text).toContain(mockError.message);
  });
});