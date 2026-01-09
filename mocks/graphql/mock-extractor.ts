import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

interface HarEntry {
  request: {
    url: string;
    method: string;
    postData?: {
      text: string;
    };
  };
  response: {
    content: {
      text?: string;
    };
  };
}

interface HarFile {
  log: {
    entries: HarEntry[];
  };
}

interface MockMetadata {
  operationName: string;
  schemaHash: string;
  lastUpdated: string;
}

interface GraphQLOperation {
  operationName: string;
  query: string;
}

/**
 * Extracts GraphQL operation name from POST request body
 */
function extractOperationName(postData?: string): string | null {
  if (!postData) return null;
  
  try {
    const parsed = JSON.parse(postData);
    
    // First, check if operationName is explicitly provided
    if (parsed.operationName) {
      return parsed.operationName;
    }
    
    // Otherwise, extract from the query string
    if (parsed.query) {
      const match = parsed.query.match(/(?:query|mutation)\s+(\w+)/);
      return match ? match[1] : null;
    }
    
    return null;
  } catch {
    // Fallback: try to extract directly from the string
    const match = postData.match(/(?:query|mutation)\s+(\w+)/);
    return match ? match[1] : null;
  }
}

/**
 * Extracts all GraphQL operations (name + query) from a HAR file
 * Used to preserve existing operations when re-recording
 */
export async function extractGraphQLOperations(
  harPath: string
): Promise<GraphQLOperation[]> {
  try {
    const harContent = await fs.readFile(harPath, "utf-8");
    const har: HarFile = JSON.parse(harContent);
    
    const operations: GraphQLOperation[] = [];
    const seen = new Set<string>();
    
    for (const entry of har.log.entries) {
      if (entry.request.method !== "POST") continue;
      
      const postData = entry.request.postData?.text;
      if (!postData) continue;
      
      try {
        const parsed = JSON.parse(postData);
        const operationName = parsed.operationName || extractOperationName(postData);
        
        if (!operationName || operationName === "IntrospectionQuery") continue;
        if (seen.has(operationName)) continue;
        
        seen.add(operationName);
        operations.push({
          operationName,
          query: parsed.query
        });
      } catch {
        continue;
      }
    }
    
    return operations;
  } catch {
    return []; // Return empty if HAR doesn't exist yet
  }
}

/**
 * Generate a hash of the response structure to detect schema changes
 * Only considers the shape/structure, not the actual data values
 */
function generateSchemaHash(response: any): string {
  // Extract only the structure (types and keys), not values
  const getStructure = (obj: any): any => {
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    if (Array.isArray(obj)) {
      return obj.length > 0 ? ["array", getStructure(obj[0])] : ["array", "empty"];
    }
    if (typeof obj === "object") {
      const structure: Record<string, any> = {};
      for (const key of Object.keys(obj).sort()) {
        structure[key] = getStructure(obj[key]);
      }
      return structure;
    }
    return typeof obj;
  };

  const structure = getStructure(response);
  const structureStr = JSON.stringify(structure, null, 2);
  return crypto.createHash("md5").update(structureStr).digest("hex");
}

/**
 * Extracts all GraphQL operations from a HAR file
 * Returns a map of operationName -> response data
 */
export async function extractGraphQLMocks(
  harPath: string
): Promise<Map<string, any>> {
  const harContent = await fs.readFile(harPath, "utf-8");
  const har: HarFile = JSON.parse(harContent);
  
  const mocks = new Map<string, any>();
  
  for (const entry of har.log.entries) {
    // Only process POST requests (GraphQL queries)
    if (entry.request.method !== "POST") continue;
    
    const operationName = extractOperationName(entry.request.postData?.text);
    if (!operationName) continue;
    
    // Skip introspection queries (not application queries)
    if (operationName === "IntrospectionQuery") continue;
    
    const responseText = entry.response.content.text;
    if (!responseText) continue;
    
    try {
      const response = JSON.parse(responseText);
      mocks.set(operationName, response);
    } catch (error) {
      console.warn(`Failed to parse response for ${operationName}:`, error);
    }
  }
  
  return mocks;
}

/**
 * Saves extracted GraphQL mocks to individual TypeScript files
 */
export async function saveGraphQLMocksToFiles(
  harPath: string,
  outputDir: string
): Promise<void> {
  const mocks = await extractGraphQLMocks(harPath);
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  for (const [operationName, response] of mocks.entries()) {
    const fileName = `${operationName}.mock.ts`;
    const filePath = path.join(outputDir, fileName);
    
    const schemaHash = generateSchemaHash(response);
    const metadata: MockMetadata = {
      operationName,
      schemaHash,
      lastUpdated: new Date().toISOString(),
    };
    
    const fileContent = `// Auto-generated from HAR file
// Operation: ${operationName}
// Schema Hash: ${schemaHash}
// Last Updated: ${metadata.lastUpdated}

export const ${operationName}Mock = ${JSON.stringify(response, null, 2)};

export const metadata = ${JSON.stringify(metadata, null, 2)};
`;
    
    await fs.writeFile(filePath, fileContent, "utf-8");
    console.log(`✓ Created ${fileName}`);
  }
  
  console.log(`\n✓ Extracted ${mocks.size} GraphQL operation(s) to ${outputDir}`);
}

/**
 * Checks if schema has changed for a given operation
 * 
 * LIMITATION: This function compares the HAR file with the existing mock file.
 * If you manually edit the HAR and then re-extract mocks, both will have the same
 * structure, so no change will be detected.
 * 
 * PROPER USAGE: 
 * 1. Keep mock files as your baseline
 * 2. Record new API responses to HAR
 * 3. Call this function to compare new HAR responses with old mocks
 * 4. If changed, re-extract to update mocks
 * 
 * For manual testing of schema changes:
 * - Delete GetCountries.mock.ts
 * - Manually edit the HAR response structure (change field names/types)
 * - Run test 4 - it will detect the change and create new mock
 */
export async function hasSchemaChanged(
  operationName: string,
  harPath: string,
  mocksDir: string
): Promise<boolean> {
  try {
    // Get current hash from HAR
    const mocks = await extractGraphQLMocks(harPath);
    const currentResponse = mocks.get(operationName);
    if (!currentResponse) return false;
    
    const currentHash = generateSchemaHash(currentResponse);
    
    // Get existing hash from mock file
    const mockFilePath = path.join(mocksDir, `${operationName}.mock.ts`);
    const mockContent = await fs.readFile(mockFilePath, "utf-8");
    const hashMatch = mockContent.match(/Schema Hash: ([a-f0-9]+)/);
    
    if (!hashMatch) return true; // No hash found, consider it changed
    
    const existingHash = hashMatch[1];
    const changed = currentHash !== existingHash;
    
    if (changed) {
      console.log(`📊 Schema change detected for ${operationName}:`);
      console.log(`   Old hash: ${existingHash}`);
      console.log(`   New hash: ${currentHash}`);
    }
    
    return changed;
    
  } catch {
    return true; // Error reading, consider it changed
  }
}

/**
 * Loads a specific GraphQL mock by operation name
 */
export async function loadGraphQLMock(
  operationName: string,
  mocksDir: string
): Promise<any | null> {
  const filePath = path.join(mocksDir, `${operationName}.mock.ts`);
  
  try {
    // Dynamic import of the mock file
    const mock = await import(filePath);
    return mock[`${operationName}Mock`] || null;
  } catch {
    return null;
  }
}

/**
 * Checks if a mock exists for a given operation
 */
export async function hasMockForOperation(
  operationName: string,
  mocksDir: string
): Promise<boolean> {
  const filePath = path.join(mocksDir, `${operationName}.mock.ts`);
  
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
