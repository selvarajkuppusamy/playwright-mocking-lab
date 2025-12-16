import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs/promises";
import { setLocationAndFetch } from "./utils/fgraph-ui-actions";

const HAR_PATH = path.join(__dirname, "../mocks/open-meteo.har");
const API_GLOB = "**://api.open-meteo.com/v1/forecast**";


test("update HAR: refresh/append entries using real network (wait for response)", async ({ browser }) => {
  // Ensure folder exists
  await fs.mkdir(path.dirname(HAR_PATH), { recursive: true });

  const context = await browser.newContext();

  await context.routeFromHAR(HAR_PATH, {
    url: API_GLOB,
    update: true,
    updateContent: "embed", // so response.content.text is present when possible
  });

  const page = await context.newPage();

  // Start action that triggers request
  await setLocationAndFetch(page);

  // ✅ CRITICAL: wait for the actual Open-Meteo response to finish
  const response = await page.waitForResponse((resp) => {
    return resp.url().includes("api.open-meteo.com/v1/forecast") && resp.status() === 200;
  }, { timeout: 20_000 });

  // Optional: prove we got JSON
  const json = await response.json();
  expect(json).toBeTruthy();

  // Give Playwright a moment to write/flush response body (usually not needed, but helps)
  await page.waitForTimeout(500);

  await context.close(); // ✅ flushes HAR update to disk
});