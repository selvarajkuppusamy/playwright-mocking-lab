import fs from "fs/promises";

type HarEntry = {
  request?: { url?: string };
  response?: { content?: { text?: string } };
};

type HarLog = { entries?: HarEntry[] };
type HarFile = { log?: HarLog };

export async function readHarJsonResponse(harPath: string, urlIncludes: string): Promise<any> {
  const raw = await fs.readFile(harPath, "utf-8");
  const har: HarFile = JSON.parse(raw);

  const entry = har?.log?.entries?.find((e) =>
    String(e?.request?.url || "").includes(urlIncludes)
  );

  if (!entry) {
    throw new Error(`No HAR entry found containing URL fragment: ${urlIncludes}`);
  }

  const text = entry?.response?.content?.text;
  if (typeof text !== "string" || text.length === 0) {
    throw new Error(
      `HAR entry has no embedded response body (content.text missing). ` +
        `Ensure you recorded with content: "embed".`
    );
  }

  return JSON.parse(text);
}

/**
 * Returns a stable “shape signature” for any JSON object:
 * - Collects all key paths (e.g. current.temperature_2m, current_units.time)
 * - Ignores actual values
 * - Includes array marker [] so structural array paths remain stable
 */
export function jsonShapeSignature(value: unknown): string {
  const paths: string[] = [];

  function walk(v: any, prefix: string) {
    if (v === null || v === undefined) return;

    if (Array.isArray(v)) {
      // Treat array as a structural node; analyze the first element if it exists
      const arrayPrefix = prefix ? `${prefix}[]` : "[]";
      paths.push(arrayPrefix);

      if (v.length > 0) walk(v[0], arrayPrefix);
      return;
    }

    if (typeof v === "object") {
      const keys = Object.keys(v).sort();
      for (const k of keys) {
        const p = prefix ? `${prefix}.${k}` : k;
        paths.push(p);
        walk(v[k], p);
      }
    }
  }

  walk(value, "");

  // Remove duplicates + sort so signature is stable
  const unique = Array.from(new Set(paths)).sort();
  return unique.join("|");
}

/**
 * Useful for debugging: show structural differences.
 */
export function diffSignatures(oldSig: string, newSig: string) {
  const oldSet = new Set(oldSig.split("|").filter(Boolean));
  const newSet = new Set(newSig.split("|").filter(Boolean));

  const added = Array.from(newSet).filter((x) => !oldSet.has(x)).sort();
  const removed = Array.from(oldSet).filter((x) => !newSet.has(x)).sort();

  return { added, removed };
}
