import { findTaxonomyFile } from "./file-utils.js";

/**
 * Process taxonomy content into a formatted, hierarchical representation
 * @param taxonomyId ID of the taxonomy to process
 * @returns Formatted taxonomy content and metadata
 */
export async function processTaxonomy(taxonomyId: string): Promise<{
  formattedContent: string;
  taxonomyId: string;
  filepath: string;
} | null> {
  const taxonomyFile = await findTaxonomyFile(taxonomyId);
  
  if (!taxonomyFile) {
    return null;
  }
  
  const { content, path } = taxonomyFile;
  
  // Process the taxonomy content to make it more navigable
  const lines = content.split('\n');
  const processedTaxonomy = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.startsWith('#')) {
      // Add comments as is (useful context)
      processedTaxonomy.push(line);
      continue;
    }
    
    const depth = line.search(/\S/) / 2; // Convert to level (assuming 2 spaces per level)
    const indentation = "  ".repeat(depth);
    
    // Split the line to get the entry and description
    const parts = line.trim().split(':');
    const entryId = parts[0].trim();
    const entryDescription = parts.length > 1 ? parts.slice(1).join(':').trim() : '';
    
    // Format the entry for better readability
    const formattedEntry = `${indentation}- ${entryId}${entryDescription ? `: ${entryDescription}` : ''}`;
    processedTaxonomy.push(formattedEntry);
  }
  
  // Add interactive navigation information
  processedTaxonomy.push('\n## Navigation');
  processedTaxonomy.push('- Use openfoodfacts://taxonomy/{taxonomy_id} to view other taxonomies');
  processedTaxonomy.push('- View the raw taxonomy file at openfoodfacts://file/taxonomies/' + taxonomyId + '.txt');
  
  return {
    formattedContent: `# Taxonomy: ${taxonomyId}\n\nFile: ${path}\n\n` + processedTaxonomy.join('\n'),
    taxonomyId,
    filepath: path
  };
}