import { Page } from '@playwright/test';
import { GRAPHQL_MOCKS } from '../../mocks/graphql/mock-registry';

/**
 * Sets up GraphQL request mocking for a Playwright page
 * 
 * @param page - Playwright page object
 * @param strictMode - If true, throws error when mock is missing. If false, allows fallback to live server.
 * 
 * @example
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await setupGraphQLMocks(page); // Strict mode by default
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // Permissive mode - allows fallback to live server
 * await setupGraphQLMocks(page, false);
 * ```
 */
export async function setupGraphQLMocks(page: Page, strictMode: boolean = true): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();
    const operationName = postData?.operationName;

    // Skip IntrospectionQuery (GraphQL schema introspection)
    if (operationName === 'IntrospectionQuery') {
      await route.continue();
      return;
    }

    if (GRAPHQL_MOCKS.has(operationName)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(GRAPHQL_MOCKS.get(operationName))
      });
    } else if (strictMode) {
      throw new Error(`❌ Missing mock for operation: ${operationName}`);
    } else {
      console.log(`⚠️  No mock found for: ${operationName}, falling back to live server`);
      await route.continue();
    }
  });
}
