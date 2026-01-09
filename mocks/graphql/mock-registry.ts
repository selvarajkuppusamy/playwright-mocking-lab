/**
 * GraphQL Mock Registry
 * 
 * Centralized registry of all GraphQL operation mocks.
 * Import this in test files instead of managing individual imports.
 * 
 * ⚠️  AUTO-GENERATED - Do not edit manually!
 * Run: npm run mock:update-registry to regenerate
 */

import { GetContinentMock } from "./GetContinent.mock";
import { GetCountriesMock } from "./GetCountries.mock";
import { GetCountryMock } from "./GetCountry.mock";

/**
 * Map of GraphQL operation names to their mock responses
 * Key: operationName from GraphQL request
 * Value: Mock response object
 */
export const GRAPHQL_MOCKS = new Map<string, any>([
  ["GetContinent", GetContinentMock],
  ["GetCountries", GetCountriesMock],
  ["GetCountry", GetCountryMock],
]);

/**
 * Helper to check if a mock exists for an operation
 */
export function hasMock(operationName: string): boolean {
  return GRAPHQL_MOCKS.has(operationName);
}

/**
 * Helper to get a mock for an operation
 */
export function getMock(operationName: string): any {
  return GRAPHQL_MOCKS.get(operationName);
}

/**
 * Helper to list all available mock operations
 */
export function listMocks(): string[] {
  return Array.from(GRAPHQL_MOCKS.keys());
}
