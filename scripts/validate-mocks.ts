/**
 * Validate GraphQL mocks against live server
 * 
 * This script compares your local mock files with the live GraphQL server
 * to detect drift (schema changes, removed operations, errors).
 * 
 * Run manually or on a schedule to get early warnings about API changes.
 * Does NOT modify any files - read-only validation.
 */

import { readFile } from "fs/promises";
import path from "path";
import { extractGraphQLOperations } from "../mocks/graphql/mock-extractor";

const HAR_PATH = path.join(process.cwd(), "mocks", "graphql-operations.har");
const GRAPHQL_ENDPOINT = "https://countries.trevorblades.com/";

interface ValidationResult {
  operationName: string;
  status: "✅ OK" | "⚠️ DRIFT" | "❌ ERROR" | "🚫 REMOVED";
  message: string;
  added?: string[];
  removed?: string[];
}

/**
 * Extract field names from response structure (recursive)
 * Returns a sorted set of all field paths in the response
 */
function extractFieldPaths(data: any, prefix = ""): Set<string> {
  const paths = new Set<string>();
  
  if (data === null || data === undefined) {
    return paths;
  }
  
  if (Array.isArray(data)) {
    // For arrays, analyze all items to catch all possible fields
    data.forEach(item => {
      const itemPaths = extractFieldPaths(item, prefix);
      itemPaths.forEach(path => paths.add(path));
    });
    return paths;
  }
  
  if (typeof data === "object") {
    Object.keys(data).forEach(key => {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      paths.add(fieldPath);
      
      // Recurse into nested objects/arrays
      const nestedPaths = extractFieldPaths(data[key], fieldPath);
      nestedPaths.forEach(path => paths.add(path));
    });
  }
  
  return paths;
}

/**
 * Compare two responses for schema differences
 * Returns added and removed field paths
 */
function compareSchemas(mockData: any, liveData: any): {
  added: string[];
  removed: string[];
  unchanged: string[];
} {
  const mockFields = extractFieldPaths(mockData);
  const liveFields = extractFieldPaths(liveData);
  
  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];
  
  // Find fields in live but not in mock (additions)
  liveFields.forEach(field => {
    if (!mockFields.has(field)) {
      added.push(field);
    } else {
      unchanged.push(field);
    }
  });
  
  // Find fields in mock but not in live (removals)
  mockFields.forEach(field => {
    if (!liveFields.has(field)) {
      removed.push(field);
    }
  });
  
  return {
    added: added.sort(),
    removed: removed.sort(),
    unchanged: unchanged.sort()
  };
}

/**
 * Query live GraphQL server for an operation
 */
async function queryLiveServer(
  operationName: string,
  query: string
): Promise<{ data?: any; errors?: any[] }> {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationName, query })
    });

    if (!response.ok) {
      return { errors: [{ message: `HTTP ${response.status}` }] };
    }

    const json: any = await response.json();
    
    if (json.errors) {
      return { errors: json.errors };
    }

    return { data: json.data };
  } catch (error: any) {
    return { errors: [{ message: error.message }] };
  }
}

/**
 * Get response data from existing mock file
 */
async function getMockData(operationName: string): Promise<any | null> {
  try {
    const mockPath = path.join(
      process.cwd(),
      "mocks",
      "graphql",
      `${operationName}.mock.ts`
    );
    
    // Read and parse the file to extract the data
    const content = await readFile(mockPath, "utf-8");
    
    // Find the start of the export object
    const exportStart = content.indexOf("= {");
    if (exportStart === -1) return null;
    
    // Extract from "= {" onwards and find matching braces
    const startPos = exportStart + 2;
    let braceCount = 0;
    let endPos = startPos;
    let inString = false;
    let escapeNext = false;
    
    for (let i = startPos; i < content.length; i++) {
      const char = content[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        
        if (braceCount === 0 && char === '}') {
          endPos = i + 1;
          break;
        }
      }
    }
    
    const jsonStr = content.substring(startPos, endPos);
    const mockObject = JSON.parse(jsonStr);
    return mockObject.data;
  } catch (error) {
    return null;
  }
}

/**
 * Validate all operations in HAR against live server
 */
async function validateMocks(): Promise<ValidationResult[]> {
  console.log("🔍 Validating GraphQL mocks against live server...\n");
  console.log(`📁 HAR file: ${HAR_PATH}`);
  console.log(`🌐 GraphQL endpoint: ${GRAPHQL_ENDPOINT}\n`);

  // Extract operations from HAR
  const operations = await extractGraphQLOperations(HAR_PATH);
  
  // Filter out IntrospectionQuery
  const userOperations = operations.filter(
    op => op.operationName !== "IntrospectionQuery"
  );

  console.log(`Found ${userOperations.length} operation(s) to validate\n`);
  console.log("─".repeat(80));

  const results: ValidationResult[] = [];

  for (const { operationName, query } of userOperations) {
    console.log(`\n🔎 Validating: ${operationName}`);

    // Get mock data
    const mockData = await getMockData(operationName);
    if (!mockData) {
      results.push({
        operationName,
        status: "⚠️ DRIFT",
        message: "Mock file not found or couldn't parse data"
      });
      console.log(`   ⚠️  No mock file found`);
      continue;
    }

    // Query live server
    console.log(`   → Querying live server...`);
    const liveResult = await queryLiveServer(operationName, query);

    if (liveResult.errors) {
      // Operation returned errors
      const errorMsg = liveResult.errors.map(e => e.message).join(", ");
      results.push({
        operationName,
        status: "❌ ERROR",
        message: `Live server returned errors: ${errorMsg}`
      });
      console.log(`   ❌ Server error: ${errorMsg}`);
      continue;
    }

    if (!liveResult.data) {
      // Operation might be removed
      results.push({
        operationName,
        status: "🚫 REMOVED",
        message: "Operation may have been removed from API"
      });
      console.log(`   🚫 No data returned - possibly removed`);
      continue;
    }

    // Compare schemas (field-level comparison)
    const comparison = compareSchemas(mockData, liveResult.data);
    
    if (comparison.added.length === 0 && comparison.removed.length === 0) {
      results.push({
        operationName,
        status: "✅ OK",
        message: "Schema matches - all fields present"
      });
      console.log(`   ✅ Schema matches (${comparison.unchanged.length} fields)`);
    } else {
      const changes: string[] = [];
      if (comparison.added.length > 0) {
        changes.push(`${comparison.added.length} added`);
      }
      if (comparison.removed.length > 0) {
        changes.push(`${comparison.removed.length} removed`);
      }
      
      results.push({
        operationName,
        status: "⚠️ DRIFT",
        message: `Schema drift: ${changes.join(", ")}`,
        added: comparison.added,
        removed: comparison.removed
      });
      console.log(`   ⚠️  Schema drift detected: ${changes.join(", ")}`);
      
      if (comparison.added.length > 0 && comparison.added.length <= 5) {
        console.log(`      ➕ Added: ${comparison.added.join(", ")}`);
      } else if (comparison.added.length > 5) {
        console.log(`      ➕ Added: ${comparison.added.slice(0, 5).join(", ")} ... and ${comparison.added.length - 5} more`);
      }
      
      if (comparison.removed.length > 0 && comparison.removed.length <= 5) {
        console.log(`      ➖ Removed: ${comparison.removed.join(", ")}`);
      } else if (comparison.removed.length > 5) {
        console.log(`      ➖ Removed: ${comparison.removed.slice(0, 5).join(", ")} ... and ${comparison.removed.length - 5} more`);
      }
    }
  }

  return results;
}

/**
 * Print summary report
 */
function printSummary(results: ValidationResult[]) {
  console.log("\n" + "─".repeat(80));
  console.log("\n📊 VALIDATION SUMMARY\n");

  const ok = results.filter(r => r.status === "✅ OK").length;
  const drift = results.filter(r => r.status === "⚠️ DRIFT").length;
  const error = results.filter(r => r.status === "❌ ERROR").length;
  const removed = results.filter(r => r.status === "🚫 REMOVED").length;

  console.log(`✅ OK:      ${ok}`);
  console.log(`⚠️  DRIFT:   ${drift}`);
  console.log(`❌ ERROR:   ${error}`);
  console.log(`🚫 REMOVED: ${removed}`);
  console.log();

  if (drift > 0 || error > 0 || removed > 0) {
    console.log("⚠️  ACTION REQUIRED:\n");
    
    if (drift > 0) {
      console.log("   Schema drift detected. Consider re-recording:");
      console.log("   $ npm run mock:update");
      console.log("   $ npm run mock:extract\n");
    }
    
    if (error > 0) {
      console.log("   Server errors detected. Check if server is healthy");
      console.log("   before re-recording mocks.\n");
    }
    
    if (removed > 0) {
      console.log("   Operations may be removed. Verify API changes");
      console.log("   and update your tests accordingly.\n");
    }
    
    process.exit(1);
  } else {
    console.log("✅ All mocks are up to date!\n");
    process.exit(0);
  }
}

// Run validation
validateMocks()
  .then(printSummary)
  .catch(error => {
    console.error("\n❌ Validation failed:", error.message);
    process.exit(1);
  });
