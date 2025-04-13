import { vi } from 'vitest';
import path from 'path';

// Set up the mock project root for testing
vi.stubGlobal('__dirname', '/Users/jagjeevankashid/Developer/open-source/openfoodfacts-server/mcp-server');

// Set up path mocks to ensure proper path resolution
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof path>('path');
  return {
    ...actual,
    resolve: vi.fn((...args: string[]) => {
      // Preserve the actual behavior but make it mockable
      return actual.resolve(...args);
    }),
    join: vi.fn((...args: string[]) => {
      // Preserve the actual behavior but make it mockable
      return actual.join(...args);
    })
  };
});