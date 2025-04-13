import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processTaxonomy } from '../../src/utils/taxonomy-utils';
import { findTaxonomyFile } from '../../src/utils/file-utils';

// Mock the file-utils module
vi.mock('./file-utils', () => ({
  findTaxonomyFile: vi.fn()
}));

describe('Taxonomy Utilities', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('processTaxonomy', () => {
    it('should process taxonomy content into formatted representation', async () => {
      // Create mock taxonomy content with various indentation levels and formats
      const mockTaxonomyContent =
        `# Taxonomy header
# Another comment line

en:First category
  en:Subcategory 1:Description for subcategory 1
  en:Subcategory 2
    en:Nested category:This is deeply nested
    en:Another nested item

en:Second category:Main category description
  en:Child of second:With description`;

      // Setup mock for findTaxonomyFile
      vi.mocked(findTaxonomyFile).mockResolvedValue({
        content: mockTaxonomyContent,
        path: 'taxonomies/categories/taxonomy.txt'
      });

      // Call the function
      const result = await processTaxonomy('categories');

      // Assert the result
      expect(result).not.toBeNull();
      expect(result?.taxonomyId).toBe('categories');
      expect(result?.filepath).toBe('taxonomies/categories/taxonomy.txt');

      // Check that the formatted content includes expected transformations
      expect(result?.formattedContent).toContain('# Taxonomy: categories');
      expect(result?.formattedContent).toContain('File: taxonomies/categories/taxonomy.txt');
      expect(result?.formattedContent).toContain('# Taxonomy header');
      expect(result?.formattedContent).toContain('# Another comment line');

      // Check the formatting of category entries
      expect(result?.formattedContent).toContain('- en:First category');
      expect(result?.formattedContent).toContain('  - en:Subcategory 1: Description for subcategory 1');
      expect(result?.formattedContent).toContain('    - en:Nested category: This is deeply nested');
      expect(result?.formattedContent).toContain('- en:Second category: Main category description');
    });

    it('should return null if taxonomy not found', async () => {
      // Setup mock to return null for non-existent taxonomy
      vi.mocked(findTaxonomyFile).mockResolvedValue(null);

      // Call the function
      const result = await processTaxonomy('non-existent');

      // Assert the result
      expect(result).toBeNull();
    });
  });
});