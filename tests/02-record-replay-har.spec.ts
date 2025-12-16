import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs/promises";
import { setLocationAndFetch } from "./utils/fgraph-ui-actions";

const HAR_PATH = path.join(__dirname, "../mocks/open-meteo.har");
const API_GLOB = "**://api.open-meteo.com/v1/forecast**";

function isNonEmptyString(v: any): v is string {
  return typeof v === "string" && v.length > 0;
}

async function readTemperatureFromHar(harPath: string): Promise<string> {
  const raw = await fs.readFile(harPath, "utf-8");
  const har = JSON.parse(raw);

  const entry = har?.log?.entries?.find((e: any) =>
    String(e?.request?.url || "").includes("api.open-meteo.com/v1/forecast")
  );

  if (!entry) throw new Error("No Open-Meteo forecast entry found in HAR.");

  const text = entry?.response?.content?.text;
  if (!isNonEmptyString(text)) {
    throw new Error(
      "HAR entry has no embedded response body (content.text missing). " +
      "Likely the request did not finish (status -1) or you recorded with omit/attach."
    );
  }

  const json = JSON.parse(text);
  const temp = json?.current?.temperature_2m ?? json?.current_weather?.temperature;

  if (temp === undefined) throw new Error("Temperature not found in HAR JSON.");

  return String(temp);
}



test("record HAR for Open-Meteo calls", async ({ browser }) => {

  const context = await browser.newContext({
    recordHar: { path: HAR_PATH, content: "embed" }, // embed response bodies
  });

  const page = await context.newPage();

  await setLocationAndFetch(page);

  // Give the page time to complete requests
  await page.waitForTimeout(3000);

  await context.close(); // IMPORTANT: flushes HAR to disk
});



test("replay HAR: Open-Meteo calls served from HAR + assert HAR temperature appears in UI", async ({ browser }) => {
  const expectedTemp = await readTemperatureFromHar(HAR_PATH);

  const context = await browser.newContext();

  // Use a glob string for URL matching (no regex).
  // If update: false, Playwright serves responses from HAR. :contentReference[oaicite:2]{index=2}
  await context.routeFromHAR(HAR_PATH, {
    url: API_GLOB,
    update: false,
  });

  const page = await context.newPage();
  await setLocationAndFetch(page);

  // Assert exact value from HAR appears in UI
  await expect(page.getByText(expectedTemp, { exact: false })).toBeVisible({ timeout: 10_000 });

  await context.close();
});