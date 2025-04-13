import { describe, it, expect } from 'vitest';
import { handleStaticResource } from '../../src/resources/static-resources';

describe('Static Resources Handler', () => {
  describe('handleStaticResource', () => {
    it('should return database schema documentation for schema URI', () => {
      // Test the schema resource
      const uri = 'openfoodfacts://schema';
      const result = handleStaticResource(uri);

      // Verify the result structure
      expect(result).toEqual({
        contents: [{
          uri,
          text: expect.stringContaining('Open Food Facts Database Schema Overview')
        }]
      });

      // Verify the content includes expected sections
      expect(result.contents[0].text).toContain('Products Collection');
      expect(result.contents[0].text).toContain('Taxonomies');
      expect(result.contents[0].text).toContain('User Collection');
    });

    it('should return API documentation for api-docs URI', () => {
      // Test the API docs resource
      const uri = 'openfoodfacts://api-docs';
      const result = handleStaticResource(uri);

      // Verify the result structure
      expect(result).toEqual({
        contents: [{
          uri,
          text: expect.stringContaining('Open Food Facts API Documentation')
        }]
      });

      // Verify the content includes expected sections
      expect(result.contents[0].text).toContain('Core API Endpoints');
      expect(result.contents[0].text).toContain('Product Data');
      expect(result.contents[0].text).toContain('Search Parameters');
    });

    it('should return code patterns for code-patterns URI', () => {
      // Test the code patterns resource
      const uri = 'openfoodfacts://code-patterns';
      const result = handleStaticResource(uri);

      // Verify the result structure
      expect(result).toEqual({
        contents: [{
          uri,
          text: expect.stringContaining('Open Food Facts Code Patterns')
        }]
      });

      // Verify the content includes expected sections
      expect(result.contents[0].text).toContain('Backend Perl Modules');
      expect(result.contents[0].text).toContain('Frontend Structure');
      expect(result.contents[0].text).toContain('Docker Architecture');
    });

    it('should return file organization for file-organization URI', () => {
      // Test the file organization resource
      const uri = 'openfoodfacts://file-organization';
      const result = handleStaticResource(uri);

      // Verify the result structure
      expect(result).toEqual({
        contents: [{
          uri,
          text: expect.stringContaining('Open Food Facts File Organization')
        }]
      });

      // Verify the content includes expected sections
      expect(result.contents[0].text).toContain('Core Application Code');
      expect(result.contents[0].text).toContain('Templates and UI');
      expect(result.contents[0].text).toContain('Data Definitions');
    });

    it('should throw error for unknown static resource URI', () => {
      // Test with an invalid URI
      const uri = 'openfoodfacts://unknown';
      
      // Verify that attempting to handle an unknown resource throws an error
      expect(() => handleStaticResource(uri)).toThrow(`Static resource not found: ${uri}`);
    });
  });
});