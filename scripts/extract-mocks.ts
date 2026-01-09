/**
 * Extract GraphQL mocks from HAR file
 * 
 * This script reads the HAR file and generates typed mock files
 * for each GraphQL operation found, then auto-updates mock-registry.ts.
 */

import path from "path";
import { saveGraphQLMocksToFiles, extractGraphQLMocks } from "../mocks/graphql/mock-extractor";
import { updateMockRegistry } from "./update-registry";

const HAR_PATH = path.join(process.cwd(), "mocks", "graphql-operations.har");
const MOCKS_DIR = path.join(process.cwd(), "mocks", "graphql");

async function extractMocks() {
  console.log("🔍 Extracting mocks from HAR file...\n");
  
  await saveGraphQLMocksToFiles(HAR_PATH, MOCKS_DIR);
  
  // Get operations for summary
  const operations = await extractGraphQLMocks(HAR_PATH);
  const userOperations = Array.from(operations.keys()).filter(
    name => name !== "IntrospectionQuery"
  );
  
  console.log(`\n✅ Extracted ${userOperations.length} operation(s):`);
  userOperations.forEach(operationName => {
    console.log(`  - ${operationName} → ${operationName}.mock.ts`);
  });
  
  // Auto-update mock registry
  await updateMockRegistry();
  
  console.log("\n💡 Next steps:");
  console.log("   1. Run 'npm run mock:codegen' to regenerate types from schema");
  console.log("   2. Manually add types to mock files if needed\n");
}

extractMocks()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Extraction failed:", error.message);
    process.exit(1);
  });
