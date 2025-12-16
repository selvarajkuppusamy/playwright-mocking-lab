import { test, expect } from "@playwright/test";
import path from "path";
import {
  readHarJsonResponse,
  jsonShapeSignature,
  diffSignatures,
} from "./utils/har-shape";
import fs from "fs/promises";
import { setLocationAndFetch } from "./utils/fgraph-ui-actions";

const HAR_PATH = path.join(__dirname, "../mocks/open-meteo.har");
const URL_FRAGMENT = "api.open-meteo.com/v1/forecast";
const API_GLOB = "**://api.open-meteo.com/v1/forecast**";

// Keep this aligned with how your app requests Open-Meteo
const LIVE_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timeformat=unixtime";



test("HAR structural check: update snapshot only if JSON shape changed", async ({ request, browser, page }) => {
  // Ensure folder exists
  await fs.mkdir(path.dirname(HAR_PATH), { recursive: true });

  const harJson = await readHarJsonResponse(HAR_PATH, URL_FRAGMENT);
  const harSig = jsonShapeSignature(harJson);

  const liveResp = await request.get(LIVE_URL);
  expect(liveResp.ok()).toBeTruthy();

  const liveJson = await liveResp.json();
  const liveSig = jsonShapeSignature(liveJson);

  if (harSig === liveSig) {
    console.log("\n✅ JSON structure unchanged. No HAR update needed.");
  } else {
    const { added, removed } = diffSignatures(harSig, liveSig);

    console.log("\n🟡 JSON structure changed — HAR update recommended.");
    if (added.length) console.log("\n  ➕ New JSON Parameters:", added.slice(0, 50));
    if (removed.length) console.log("\n  ➖ Removed JSON Parameters:", removed.slice(0, 50));

    // Keep the test green or fail intentionally — your choice:
    // Option A: fail to force attention
    // expect(harSig, "HAR JSON shape changed - refresh HAR snapshot").toBe(liveSig);

    // Option B: keep green and just report
    // expect(true).toBe(true);

    // // Option C: auto-update HAR file (advanced - requires fs/promises)
    // // Pasted update logic from record-har.spec.ts
    // await fs.mkdir(path.dirname(HAR_PATH), { recursive: true });

    // const context = await browser.newContext();

    // await context.routeFromHAR(HAR_PATH, {
    //     url: API_GLOB,
    //     update: true,
    //     updateContent: "embed", // so response.content.text is present when possible
    // });

    // const page = await context.newPage();

    // // Start action that triggers request
    // await setLocationAndFetch(page);

    // // ✅ CRITICAL: wait for the actual Open-Meteo response to finish
    // const response = await page.waitForResponse((resp) => {
    //     return resp.url().includes("api.open-meteo.com/v1/forecast") && resp.status() === 200;
    // }, { timeout: 20_000 });

    // // Optional: prove we got JSON
    // const json = await response.json();
    // expect(json).toBeTruthy();

    // // Give Playwright a moment to write/flush response body (usually not needed, but helps)
    // await page.waitForTimeout(500);

    // await context.close(); // ✅ flushes HAR update to disk

    // console.log("\n🟢 HAR file auto-updated with latest JSON structure.")

    // const updatedHarJson = await readHarJsonResponse(HAR_PATH, URL_FRAGMENT);
    // const updatedHarSig = jsonShapeSignature(updatedHarJson);
    // expect(updatedHarSig).toBe(liveSig);

    // console.log("\n🟡 Old JSON shape signature:", harSig);
    // console.log("\n🟢 New JSON shape signature:", updatedHarSig);
    // await page.close();
  }
});
