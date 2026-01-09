/**
 * GraphQL Smart Mocking Tests
 * 
 * These tests use pre-generated mock files to test GraphQL operations offline.
 * Mocks are imported directly from *.mock.ts files (source of truth for tests).
 * 
 * Setup (run these scripts manually when needed):
 * - npm run mock:record   → Record operations to HAR
 * - npm run mock:extract  → Generate mock files from HAR
 * - npm run mock:update   → Re-record all operations + add new ones
 * - npm run mock:validate → Check for drift vs live server
 * 
 * These tests run offline using committed mock files.
 * Tests will FAIL if a required mock is missing (strict mode).
 */

import { test, expect, Page } from "@playwright/test";
import { GRAPHQL_MOCKS } from "../mocks/graphql/mock-registry";
import { setupGraphQLMocks } from "./utils/mock-helper";
import type { GetCountriesResponse } from '../mocks/graphql/GetCountries.mock';
import type { Country } from '../mocks/graphql/generated-types';

const GQL_API_URL = "**://countries.trevorblades.com/**";

// Strict Mock Mode: Fail tests if mocks are missing (default: true)
// Set MOCK_STRICT=false to allow fallback to live server (permissive mode)
const STRICT_MOCK_MODE = process.env.MOCK_STRICT !== "false";

/**
 * GraphQL Queries
 */
const GET_COUNTRIES_QUERY = `query GetCountries {
  countries {
    code
    name
    emoji
  }
}`;

const GET_COUNTRY_QUERY = `query GetCountry {
  country(code: "US") {
    code
    name
    emoji
    capital
    currency
  }
}`;

/**
 * Helper: Execute GraphQL query
 */
async function executeGraphQLQuery(
  page: Page,
  operationName: string,
  query: string,
  variables?: Record<string, any>
): Promise<any> {
  return await page.evaluate(
    async ({ operationName, query, variables }) => {
      const res = await fetch("https://countries.trevorblades.com/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationName,
          query,
          ...(variables && { variables })
        })
      });
      return res.json();
    },
    { operationName, query, variables }
  );
}

test.beforeEach(async ({ page }) => {
  await setupGraphQLMocks(page, STRICT_MOCK_MODE);
  await page.goto("about:blank");
});

/**
 * Test: GetCountries operation with mock
 * Demonstrates type-safe mock consumption with full IntelliSense support
 * STRICT MOCK MODE (default): Fails if mock is missing
 * PERMISSIVE MODE (MOCK_STRICT=false): Falls back to live server
 */
test("GetCountries operation returns typed country list", async ({ page }) => {
  const response = await executeGraphQLQuery(page, "GetCountries", GET_COUNTRIES_QUERY);

  // ✅ Type safety: response is typed as GetCountriesResponse
  expect(response.data.countries).toBeDefined();
  expect(response.data.countries.length).toBeGreaterThan(0);
  
  // ✅ Type safety: TypeScript knows countries is Country[]
  const firstCountry: Partial<Country> = response.data.countries[0];
  expect(firstCountry.code).toBeDefined();
  expect(firstCountry.name).toBeDefined();
  expect(firstCountry.emoji).toBeDefined();
  
  console.log("✅ GetCountries mock served successfully");
  console.log(`   Received ${response.data.countries.length} countries`);
  console.log(`   First country: ${firstCountry.name} (${firstCountry.code}) ${firstCountry.emoji}`);
});

/**
 * Test: GetCountry operation with mock
 * Demonstrates querying a single country with parameters
 * STRICT MOCK MODE (default): Fails if mock is missing
 * PERMISSIVE MODE (MOCK_STRICT=false): Falls back to live server
 */
test("GetCountry operation returns specific country details", async ({ page }) => {
  const response = await executeGraphQLQuery(page, "GetCountry", GET_COUNTRY_QUERY);

  // Verify the mocked response
  expect(response.data).toBeDefined();
  expect(response.data.country).toBeDefined();
  expect(response.data.country.code).toBe("US");
  expect(response.data.country.name).toBeDefined();
  expect(response.data.country.capital).toBeDefined();
  expect(response.data.country.currency).toBeDefined();
  
  console.log("✅ GetCountry mock served successfully");
  console.log(`   Country: ${response.data.country.name} (${response.data.country.code})`);
  console.log(`   Capital: ${response.data.country.capital}`);
  console.log(`   Currency: ${response.data.country.currency}`);
});

