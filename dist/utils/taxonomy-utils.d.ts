/**
 * Process taxonomy content into a formatted, hierarchical representation
 * @param taxonomyId ID of the taxonomy to process
 * @returns Formatted taxonomy content and metadata
 */
export declare function processTaxonomy(taxonomyId: string): Promise<{
    formattedContent: string;
    taxonomyId: string;
    filepath: string;
} | null>;
