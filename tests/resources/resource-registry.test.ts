import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeResourceRequest, availableResources } from '../../src/resources/resource-registry';
import { handleProjectStructure } from '../../src/resources/project-structure';
import { handleFileContent } from '../../src/resources/file-content';
import { handleProjectInfo } from '../../src/resources/project-info';
import { handleTaxonomy } from '../../src/resources/taxonomy';
import { handleStaticResource } from '../../src/resources/static-resources';

// Mock all resource handlers
vi.mock('../../src/resources/project-structure', () => ({
    handleProjectStructure: vi.fn()
}));

vi.mock('../../src/resources/file-content', () => ({
    handleFileContent: vi.fn()
}));

vi.mock('../../src/resources/project-info', () => ({
    handleProjectInfo: vi.fn()
}));

vi.mock('../../src/resources/taxonomy', () => ({
    handleTaxonomy: vi.fn()
}));

vi.mock('../../src/resources/static-resources', () => ({
    handleStaticResource: vi.fn()
}));

describe('Resource Registry', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('availableResources', () => {
        it('should define all required resources', () => {
            expect(availableResources).toBeInstanceOf(Array);
            const resourceUris = availableResources.map(r => r.uri);
            expect(resourceUris).toContain('openfoodfacts://structure/');
            expect(resourceUris).toContain('openfoodfacts://info');
            expect(resourceUris).toContain('openfoodfacts://schema');
            expect(resourceUris).toContain('openfoodfacts://api-docs');
            expect(resourceUris).toContain('openfoodfacts://code-patterns');
            expect(resourceUris).toContain('openfoodfacts://file-organization');
            expect(resourceUris).toContain('openfoodfacts://taxonomy/categories');

            availableResources.forEach(resource => {
                expect(resource).toHaveProperty('uri');
                expect(resource).toHaveProperty('name');
                expect(resource).toHaveProperty('description');
            });
        });
    });

    describe('routeResourceRequest', () => {
        it('should route project structure resource requests correctly', async () => {
            const uri = 'openfoodfacts://structure/path';
            const mockResponse = { contents: [{ uri, text: 'structure content', isError: false }] };

            vi.mocked(handleProjectStructure).mockResolvedValue(mockResponse);

            const result = await routeResourceRequest(uri);

            expect(handleProjectStructure).toHaveBeenCalledWith(uri, expect.any(URL));
            expect(result).toBe(mockResponse);
        });

        it('should route file content resource requests correctly', async () => {
            const uri = 'openfoodfacts://file/path/to/file.txt';
            const mockResponse = { contents: [{ uri, text: 'file content', isError: false }] };

            vi.mocked(handleFileContent).mockResolvedValue(mockResponse);

            const result = await routeResourceRequest(uri);

            expect(handleFileContent).toHaveBeenCalledWith(uri, expect.any(URL));
            expect(result).toBe(mockResponse);
        });

        it('should route project info resource requests correctly', async () => {
            const uri = 'openfoodfacts://info';
            const mockResponse = { contents: [{ uri, text: 'project info', isError: false }] };

            vi.mocked(handleProjectInfo).mockResolvedValue(mockResponse);

            const result = await routeResourceRequest(uri);

            expect(handleProjectInfo).toHaveBeenCalledWith(uri);
            expect(result).toBe(mockResponse);
        });

        it('should route taxonomy resource requests correctly', async () => {
            const uri = 'openfoodfacts://taxonomy/categories';
            const mockResponse = {
                contents: [{
                    uri,
                    text: 'taxonomy content',
                    metadata: {
                        taxonomyId: 'categories',
                        filepath: 'taxonomy/categories.json'
                    }
                }]
            };

            vi.mocked(handleTaxonomy).mockResolvedValue(mockResponse);

            const result = await routeResourceRequest(uri);

            expect(handleTaxonomy).toHaveBeenCalledWith(uri, expect.any(URL));
            expect(result).toBe(mockResponse);
        });

        it('should route static resource requests correctly', async () => {
            const staticResources = [
                'openfoodfacts://schema',
                'openfoodfacts://api-docs',
                'openfoodfacts://code-patterns',
                'openfoodfacts://file-organization'
            ];

            for (const uri of staticResources) {
                const mockResponse = { contents: [{ uri, text: 'static content', isError: false }] };
                vi.mocked(handleStaticResource).mockReturnValue(mockResponse);

                const result = await routeResourceRequest(uri);

                expect(handleStaticResource).toHaveBeenCalledWith(uri);
                expect(result).toBe(mockResponse);

                vi.mocked(handleStaticResource).mockReset();
            }
        });

        it('should handle errors for unknown resources', async () => {
            const uri = 'openfoodfacts://unknown';

            const result = await routeResourceRequest(uri);

            expect(result).toEqual({
                contents: [{
                    uri,
                    text: 'Error processing request: Resource not found: openfoodfacts://unknown',
                    isError: true
                }]
            });
        });

        it('should handle errors from resource handlers', async () => {
            const uri = 'openfoodfacts://structure/path';
            const error = new Error('Handler error');

            vi.mocked(handleProjectStructure).mockRejectedValue(error);

            const result = await routeResourceRequest(uri);

            expect(result).toEqual({
                contents: [{
                    uri,
                    text: 'Error processing request: Handler error',
                    isError: true
                }]
            });
        });

        it('should handle invalid URIs', async () => {
            const uri = 'invalid-uri:///';

            const result = await routeResourceRequest(uri);

            expect(result.contents[0]).toHaveProperty('isError', true);
            expect(result.contents[0].text).toContain('Error processing request:');
        });
    });
});