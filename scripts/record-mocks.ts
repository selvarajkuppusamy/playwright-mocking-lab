/**
 * Record GraphQL operations to HAR file
 * 
 * This script captures GraphQL operations and saves them to a HAR file
 * which serves as the single source of truth for all mocked operations.
 */

import { chromium } from "@playwright/test";
import path from "path";

const HAR_PATH = path.join(process.cwd(), "mocks", "graphql-operations.har");

async function recordMocks() {
  console.log("📝 Recording GraphQL operations to HAR...\n");
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordHar: {
      path: HAR_PATH,
      content: "embed", // Embed responses for extraction
    },
  });

  const page = await context.newPage();
  
  // Navigate to a blank page (just to initialize the context)
  // GraphQL endpoint doesn't have a UI, so we create a blank page
  await page.goto("about:blank");
  await page.waitForTimeout(500);

  // Operation 1: GetCountries - Direct API call
  console.log("📝 Recording Operation 1: GetCountries");
  await page.evaluate(async () => {
    await fetch("https://countries.trevorblades.com/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "GetCountries",
        query: `query GetCountries {
          countries {
            code
            name
            emoji
          }
        }`
      })
    });
  });
  await page.waitForTimeout(1000);
  console.log("✓ Recorded GetCountries\n");

  // Operation 2: GetCountry - Direct API call
  console.log("📝 Recording Operation 2: GetCountry");
  await page.evaluate(async () => {
    await fetch("https://countries.trevorblades.com/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "GetCountry",
        query: `query GetCountry {
          country(code: "US") {
            code
            name
            emoji
            capital
            currency
          }
        }`
      })
    });
  });
  await page.waitForTimeout(1000);
  console.log("✓ Recorded GetCountry\n");

  await context.close();
  await browser.close();
  
  console.log(`✅ HAR file created at: ${HAR_PATH}`);
  console.log("   This is the single source of truth for all operations\n");
}

recordMocks()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Recording failed:", error.message);
    process.exit(1);
  });
