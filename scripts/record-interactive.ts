/**
 * Interactive GraphQL Recording
 * 
 * This script allows you to capture real GraphQL traffic by:
 * 1. Opening a browser with HAR recording
 * 2. Interacting with your UI/app (or using GraphQL Playground)
 * 3. Automatically capturing requests to HAR
 * 4. Adding new operations + updating existing operations (schema changes)
 * 
 * Run: npm run mock:record:interactive
 */

import { chromium } from "@playwright/test";
import path from "path";
import { readFile, writeFile, unlink } from "fs/promises";
import { extractGraphQLOperations } from "../mocks/graphql/mock-extractor";
import { updateMockRegistry } from "./update-registry";

const HAR_PATH = path.join(process.cwd(), "mocks", "graphql-operations.har");
const GRAPHQL_URL = "https://countries.trevorblades.com/";

async function recordInteractive() {
  console.log("🎬 Starting interactive HAR recording...\n");
  console.log("📝 Instructions:");
  console.log("   1. Browser will open with GraphQL Playground");
  console.log("   2. Execute your GraphQL operations");
  console.log("   3. Press Ctrl+C when done");
  console.log("   4. New operations will be ADDED");
  console.log("   5. Re-executing existing operations will UPDATE them (schema drift)\n");

  // Read existing operations to preserve them
  let existingOperations: any[] = [];
  try {
    existingOperations = await extractGraphQLOperations(HAR_PATH);
    console.log(`📦 Found ${existingOperations.length} existing operations in HAR\n`);
  } catch (error) {
    console.log("📦 No existing HAR file found, starting fresh\n");
  }

  // Start browser with HAR recording
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordHar: {
      path: HAR_PATH + ".new",
      mode: "minimal",
      content: "embed",
      urlFilter: "**/countries.trevorblades.com/**"
    }
  });

  const page = await context.newPage();

  console.log("🌐 Opening GraphQL Playground...\n");
  await page.goto(GRAPHQL_URL);

  console.log("✅ Ready! Execute your GraphQL operations.");
  console.log("💡 Example operations you can try:");
  console.log("   - GetContinents: query { continents { code name } }");
  console.log("   - GetLanguages: query { languages { code name } }");
  console.log("\n⏳ Recording... (Press Ctrl+C when done)\n");

  // Handle Ctrl+C gracefully
  let cleanupDone = false;
  const cleanup = async () => {
    if (cleanupDone) return;
    cleanupDone = true;
    console.log("\n\n🛑 Stopping recording...");
    try {
      // Close context first to flush HAR to disk
      await context.close();
      // Give it a moment to write the file
      await new Promise(resolve => setTimeout(resolve, 1000));
      await browser.close();
    } catch (e) {
      // Ignore errors during cleanup
    }
  };

  process.on('SIGINT', async () => {
    await cleanup();
    // Continue to merge section
    await mergeHarFiles();
    process.exit(0);
  });

  // Keep browser open until user presses Ctrl+C or closes browser
  try {
    await page.waitForTimeout(300000); // 5 minutes max
  } catch (e) {
    // Browser closed by user
  }

  await cleanup();
  await mergeHarFiles();
}

async function mergeHarFiles() {
  console.log("\n🔄 Merging new operations with existing HAR...");
  
  const HAR_PATH = path.join(process.cwd(), "mocks", "graphql-operations.har");
  
  try {
    // Check if new HAR was created
    const newHarPath = HAR_PATH + ".new";
    try {
      await readFile(newHarPath, "utf-8");
    } catch {
      console.log("\n⚠️  No new HAR file created - no operations were recorded");
      console.log("💡 Make sure you executed GraphQL operations in the playground\n");
      return;
    }

    const newHarContent = await readFile(newHarPath, "utf-8");
    const newHar = JSON.parse(newHarContent);
    
    const newOperations = await extractGraphQLOperations(newHarPath);
    
    // Filter out IntrospectionQuery
    const userOperations = newOperations.filter(
      op => op.operationName !== "IntrospectionQuery"
    );

    if (userOperations.length === 0) {
      console.log("\n⚠️  No new operations recorded");
      console.log("💡 Make sure you executed GraphQL operations in the playground\n");
      return;
    }

    // Read existing HAR
    let existingHar: any;
    let existingOperations: any[] = [];
    try {
      const existingContent = await readFile(HAR_PATH, "utf-8");
      existingHar = JSON.parse(existingContent);
      existingOperations = await extractGraphQLOperations(HAR_PATH);
    } catch {
      existingHar = { log: { entries: [] } };
    }

    // Categorize operations: new vs updated
    const existingOpNames = new Set(
      existingOperations.map(op => op.operationName)
    );

    const newOps: string[] = [];
    const updatedOps: string[] = [];

    userOperations.forEach(op => {
      if (existingOpNames.has(op.operationName)) {
        updatedOps.push(op.operationName);
      } else {
        newOps.push(op.operationName);
      }
    });

    // Build operation name to entry map for new recordings
    const newOpMap = new Map<string, any>();
    const newEntries = newHar.log.entries || [];
    
    newEntries.forEach((entry: any) => {
      const postData = entry.request?.postData?.text;
      if (!postData) return;
      
      try {
        const parsed = JSON.parse(postData);
        const opName = parsed.operationName;
        if (opName && opName !== "IntrospectionQuery") {
          newOpMap.set(opName, entry);
        }
      } catch {
        // Ignore
      }
    });

    // Merge logic:
    // 1. Keep existing operations that weren't re-recorded
    // 2. Replace operations that were re-recorded (schema updates)
    // 3. Add new operations
    const existingEntries = existingHar.log.entries || [];
    const finalEntries: any[] = [];
    const processedOps = new Set<string>();

    // Keep/Replace existing entries
    existingEntries.forEach((entry: any) => {
      const postData = entry.request?.postData?.text;
      if (!postData) {
        finalEntries.push(entry);
        return;
      }
      
      try {
        const parsed = JSON.parse(postData);
        const opName = parsed.operationName;
        
        if (newOpMap.has(opName)) {
          // Replace with updated version
          finalEntries.push(newOpMap.get(opName));
          processedOps.add(opName);
        } else {
          // Keep existing
          finalEntries.push(entry);
        }
      } catch {
        finalEntries.push(entry);
      }
    });

    // Add truly new operations (not replacements)
    newOpMap.forEach((entry, opName) => {
      if (!processedOps.has(opName)) {
        finalEntries.push(entry);
      }
    });

    existingHar.log.entries = finalEntries;

    // Write merged HAR
    await writeFile(HAR_PATH, JSON.stringify(existingHar, null, 2));

    // Clean up temporary .new file
    try {
      await unlink(newHarPath);
      console.log("🧹 Cleaned up temporary HAR file");
    } catch (e) {
      // Ignore if file doesn't exist
    }

    // Display summary
    console.log(`\n✅ HAR file updated: ${HAR_PATH}`);
    console.log(`   Total operations: ${finalEntries.length}`);
    
    if (newOps.length > 0) {
      console.log(`\n➕ Added ${newOps.length} NEW operation(s):`);
      newOps.forEach(op => console.log(`   - ${op}`));
    }
    
    if (updatedOps.length > 0) {
      console.log(`\n🔄 Updated ${updatedOps.length} EXISTING operation(s):`);
      updatedOps.forEach(op => console.log(`   - ${op}`));
    }
    
    console.log("\n💡 Next steps:");
    console.log("   1. Run: npm run mock:extract");
    console.log("   2. Registry will auto-update");
    console.log("   3. Update mock-types.ts manually (if needed)\n");

  } catch (error) {
    console.error("❌ Error merging HAR files:", error);
  }
}

recordInteractive().catch(console.error);
