/**
 * Update GraphQL mocks - Re-record all existing operations
 * 
 * This script is fully automated and CI-friendly.
 * It re-records ALL existing operations to detect schema drift.
 * 
 * For adding NEW operations, use: npm run mock:record:interactive
 */

import { chromium } from "@playwright/test";
import path from "path";
import {
  extractGraphQLOperations,
  saveGraphQLMocksToFiles,
  hasMockForOperation,
  hasSchemaChanged
} from "../mocks/graphql/mock-extractor";

const HAR_PATH = path.join(process.cwd(), "mocks", "graphql-operations.har");
const MOCKS_DIR = path.join(process.cwd(), "mocks", "graphql");

async function updateMocks() {
  console.log("🔍 Checking for missing or changed operations...\n");

  // Check for missing operations or schema changes
  const existingOperations = await extractGraphQLOperations(HAR_PATH);
  const userOperations = existingOperations.filter(
    op => op.operationName !== "IntrospectionQuery"
  );

  const missingOperations: string[] = [];
  const changedOperations: string[] = [];

  for (const { operationName } of userOperations) {
    const hasMock = await hasMockForOperation(operationName, MOCKS_DIR);
    const schemaChanged = hasMock
      ? await hasSchemaChanged(operationName, HAR_PATH, MOCKS_DIR)
      : false;

    if (!hasMock) {
      missingOperations.push(operationName);
    } else if (schemaChanged) {
      changedOperations.push(operationName);
    }
  }

  if (missingOperations.length === 0 && changedOperations.length === 0) {
    console.log("✅ All operations up to date, no update needed\n");
    return;
  }

  if (missingOperations.length > 0) {
    console.log(`⚠️  Missing mock files: ${missingOperations.join(", ")}`);
  }
  if (changedOperations.length > 0) {
    console.log(`⚠️  Schema changes detected: ${changedOperations.join(", ")}`);
  }

  console.log("\n📝 Re-recording all operations to preserve HAR integrity...\n");

  // Extract existing operations from HAR to preserve them
  console.log(`Found ${userOperations.length} existing operation(s) to preserve`);
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordHar: {
      path: HAR_PATH,
      content: "embed",
    },
  });

  const page = await context.newPage();
  await page.goto("about:blank");
  await page.waitForTimeout(500);

  // Re-record all existing operations
  for (const { operationName, query } of userOperations) {
    console.log(`📝 Re-recording: ${operationName}`);
    await page.evaluate(
      async ({ operationName, query }) => {
        await fetch("https://countries.trevorblades.com/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName, query })
        });
      },
      { operationName, query }
    );
    await page.waitForTimeout(1000);
    console.log(`✓ Re-recorded ${operationName}`);
  }

  await context.close();
  await browser.close();

  console.log(`\n✅ Updated HAR file: ${HAR_PATH}`);
  console.log(`   Re-recorded ${userOperations.length} operation(s)`);
  console.log("\n💡 Next steps:");
  console.log("   1. Run: npm run mock:extract");
  console.log("   2. Run: npm test");
  console.log("\n📝 To add new operations: npm run mock:record:interactive\n");
}

updateMocks()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Update failed:", error.message);
    process.exit(1);
  });
