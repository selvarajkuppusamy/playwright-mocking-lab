import type { Page } from "@playwright/test";

export const FGRAPH_URL = "https://fgraph.vercel.app/";

export async function setLocationAndFetch(
  page: Page,
  opts: { latitude?: string; longitude?: string } = {}
) {
  const { latitude = "51.5074", longitude = "-0.1278" } = opts;

  await page.goto(FGRAPH_URL);

  await page.getByRole("spinbutton", { name: /latitude/i }).fill(latitude);
  await page.getByRole("spinbutton", { name: /longitude/i }).fill(longitude);

  await page.getByRole("button", { name: /save location/i }).click();
  await page.getByRole("button", { name: /fetch data/i }).click();
}
