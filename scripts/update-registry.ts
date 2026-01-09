/**
 * Auto-update mock-registry.ts
 * 
 * Scans for all *.mock.ts files and automatically updates mock-registry.ts
 * with imports and GRAPHQL_MOCKS entries.
 */

import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";

const MOCKS_DIR = path.join(process.cwd(), "mocks", "graphql");
const REGISTRY_PATH = path.join(MOCKS_DIR, "mock-registry.ts");

export async function updateMockRegistry(): Promise<void> {
  console.log("\n🔄 Auto-updating mock-registry.ts...");

  // Find all *.mock.ts files
  const files = await readdir(MOCKS_DIR);
  const mockFiles = files
    .filter(f => f.endsWith(".mock.ts") && f !== "mock-registry.ts")
    .sort();

  if (mockFiles.length === 0) {
    console.log("⚠️  No mock files found");
    return;
  }

  // Generate imports
  const imports: string[] = [];
  const mapEntries: string[] = [];

  for (const file of mockFiles) {
    const baseName = file.replace(".mock.ts", "");
    const mockVarName = `${baseName}Mock`;
    
    imports.push(`import { ${mockVarName} } from "./${file.replace(".ts", "")}";`);
    mapEntries.push(`  ["${baseName}", ${mockVarName}],`);
  }

  // Generate new registry content
  const registryContent = `/**
 * GraphQL Mock Registry
 * 
 * Centralized registry of all GraphQL operation mocks.
 * Import this in test files instead of managing individual imports.
 * 
 * ⚠️  AUTO-GENERATED - Do not edit manually!
 * Run: npm run mock:update-registry to regenerate
 */

${imports.join("\n")}

/**
 * Map of GraphQL operation names to their mock responses
 * Key: operationName from GraphQL request
 * Value: Mock response object
 */
export const GRAPHQL_MOCKS = new Map<string, any>([
${mapEntries.join("\n")}
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
`;

  // Write to file
  await writeFile(REGISTRY_PATH, registryContent);

  console.log(`✅ Updated mock-registry.ts with ${mockFiles.length} operation(s):`);
  mockFiles.forEach(f => {
    const opName = f.replace(".mock.ts", "");
    console.log(`   - ${opName}`);
  });
}

// Run standalone if executed directly
if (require.main === module) {
  updateMockRegistry().catch(console.error);
}
