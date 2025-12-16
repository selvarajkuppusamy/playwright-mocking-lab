import { test, expect } from "@playwright/test";
import { setLocationAndFetch } from "./utils/fgraph-ui-actions";
import { useMocks } from "./utils/mock-toggle";

const APP_URL = "https://fgraph.vercel.app/";
const API_PATTERN = "**://api.open-meteo.com/v1/forecast**";

const mockedForecastResponse = {
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({
    latitude: 51.5,
    longitude: -0.120000124,
    generationtime_ms: 0.30684471130371094,
    utc_offset_seconds: 0,
    timezone: "GMT",
    timezone_abbreviation: "GMT",
    elevation: 16.0,
    current_units: {
      time: "unixtime",
      interval: "seconds",
      temperature_2m: "°C",
      relative_humidity_2m: "%",
      apparent_temperature: "°C",
      is_day: "",
      precipitation: "mm",
      rain: "mm",
      showers: "mm",
      snowfall: "cm",
      weather_code: "wmo code",
      cloud_cover: "%",
      pressure_msl: "hPa",
      surface_pressure: "hPa",
      wind_speed_10m: "km/h",
      wind_direction_10m: "°",
      wind_gusts_10m: "km/h",
    },
    current: {
      time: 1765836000,
      interval: 900,
      temperature_2m: 20.5,
      relative_humidity_2m: 85,
      apparent_temperature: 8.7,
      is_day: 0,
      precipitation: 0.0,
      rain: 10.0,
      showers: 10.0,
      snowfall: 10.0,
      weather_code: 7,
      cloud_cover: 20,
      pressure_msl: 100005.3,
      surface_pressure: 1003.4,
      wind_speed_10m: 9.5,
      wind_direction_10m: 169,
      wind_gusts_10m: 22.0,
    },
  }),
};

test.describe("Weather UI - REST mocking (Open-Meteo)", () => {
  test("route.fulfill(): returns mocked forecast and UI shows mocked temp", async ({ page }) => {
    let interceptedRequestUrl = "";

    if (useMocks()) {
      await page.route(API_PATTERN, async (route) => {
        if (route.request().method() !== "GET") return route.continue();

        interceptedRequestUrl = route.request().url();
        await route.fulfill(mockedForecastResponse);
      });
    }

    await setLocationAndFetch(page);

    // Assert route was hit
    if (useMocks()) {
      await expect.poll(() => interceptedRequestUrl, { timeout: 10_000 }).toContain("forecast");
    }

    // Assert UI shows mocked temp
    if (useMocks()) {
      await expect(page.getByText("20.5", { exact: false })).toBeVisible({ timeout: 10_000 });
      console.log("Mocking mode; asserted mocked temperature 20.5°C.");
    } else {
      // In real network mode, just assert some temperature value appears.
      await expect(page.getByText("Fetched result")).toBeVisible({ timeout: 10_000 });
      console.log("Real network mode; temperature value not mocked.");
    }
  });


  test("route.abort(): simulates API failure and UI shows error message", async ({ page }) => {
    let intercepted = false;

    if (useMocks()) {
      await page.route(API_PATTERN, async (route) => {
        if (route.request().method() !== "GET") return route.continue();

        intercepted = true;
        await route.abort("failed");
      });
    }

    await setLocationAndFetch(page);

    if (useMocks()) {
      // Assert route was hit (failure simulated)
      await expect.poll(() => intercepted, { timeout: 10_000 }).toBe(true);

      // Assert UI shows error message (from the DOM you shared)
      await expect(page.getByRole("heading", { name: /failed to fetch data/i })).toBeVisible({
        timeout: 10_000,
      });

      await expect(
        page.getByText(/error fetching data:\s*network error/i)
      ).toBeVisible({ timeout: 10_000 });
      console.log("Mocking mode; asserted error message in UI.");
    } else {
      console.log("Real network mode; Abort not applied.");
    }
  });


  test("route.continue(): allows real request to pass through", async ({ page }) => {
    let continued = false;

    if (useMocks()) {
      await page.route(API_PATTERN, async (route) => {
        if (route.request().method() !== "GET") return route.continue();

        continued = true;
        await route.continue(); // passthrough (no mocking)
      });
    }

    await setLocationAndFetch(page);

    if (useMocks()) {
      await expect.poll(() => continued, { timeout: 10_000 }).toBe(true);

      // Since this is real network, we just assert "some number-like temp" appears.
      // Keep it flexible: any digit with optional decimal.
      await expect(page.locator("text=/\\b\\d+(\\.\\d+)?\\b/").first()).toBeVisible({ timeout: 10_000 });
      console.log("Mocking mode; request continued to real network.");
    } else {
      console.log("Real network mode; request passed through without mocking.");
    }
  });


  test("route.continue(): modify headers before passthrough", async ({ page }) => {
    let seenHeader = false;

    if (useMocks()) {
      await page.route(API_PATTERN, async (route) => {
        const req = route.request();
        if (req.method() !== "GET") return route.continue();

        // Add/override headers
        const headers = {
          ...req.headers(),
          "x-e2e-run": "true",
          "x-e2e-suite": "playwright-mocking-lab",
        };

        // Verify locally we set them (we can't easily prove server received it without owning server,
        // but this shows you how to mutate and pass through).
        seenHeader = headers["x-e2e-run"] === "true";

        await route.continue({ headers });
      });
    }

    await setLocationAndFetch(page);

    if (useMocks()) {
      await expect.poll(() => seenHeader, { timeout: 10_000 }).toBe(true);

      // Keep assertion light since this is a real network call
      await expect(page.getByText(/temperature|°c|\b\d+(\.\d+)?\b/i).first()).toBeVisible({
        timeout: 10_000,
      });
      console.log("Mocking mode; headers modified and request continued to real network.");
    } else {
      console.log("Real network mode; headers not modified.");
    }
  });


  
  test("route.continue(): modify POST payload before sending", async ({ page }) => {
    let seenOriginal = "";
    let sentModified = "";

    
    if (useMocks()) {
      // Match the absolute URL we will POST to
      await page.route("**/post-endpoint", async (route) => {
        const req = route.request();
        seenOriginal = req.postData() || "";
        console.log("Original POST body:", seenOriginal);

        const modifiedBody = JSON.stringify(
          { 
            name: "Selva", 
            from: "modified", 
              data: {
                locationId: "-3oIxu_7_JisOsAt7y5l4MdCm-9opsi5batQa5kXxzo_restaurant",
                tableId:  "605049b2-2fa5-43a4-a5d1-8bb1effc1be2"
              }
          }
        );
        sentModified = modifiedBody;
        console.log("Modified POST body:", modifiedBody);

        await route.continue({
          postData: modifiedBody,
          headers: {
            ...req.headers(),
            "content-type": "application/json",
          },
        });
      });
    }

    // Give the page a real origin
    await page.goto("https://example.com");

    // Trigger a POST that will match "**/post-endpoint"
    await page.evaluate(async () => {
      await fetch("https://example.com/post-endpoint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "original" }),
      }).catch(() => {});
    });

    if (useMocks()) {
      expect(sentModified).toContain("modified");
      console.log("Mocking mode; POST body modified before sending.");
    } else {
      // await expect.poll(() => seenOriginal, { timeout: 5000 }).toContain("original");
      console.log("Real network mode; POST body not modified.");
    }
  });



});
