import { test, expect } from "@playwright/test";
import { useMocks } from "./utils/mock-toggle";

const isMac = process.platform === "darwin";

test("GraphQL UI: run query and mock response", async ({ page }) => {
  // Intercept the actual endpoint used by the site (root POST)
  if (useMocks()) {
    await page.route("**://countries.trevorblades.com/**", async (route) => {
        const req = route.request();
        if (req.method() !== "POST") return route.continue();

        const postData = req.postDataJSON?.() as any;

        if (postData?.operationName === "GetCountries") {
        return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
            data: {
                countries: [
                { code: "IN", name: "India", emoji: "🇮🇳" },
                { code: "GB", name: "United Kingdom", emoji: "🇬🇧" },
                ],
            },
            }),
        });
        }

        return route.continue();
    });
  }

  await page.goto("https://countries.trevorblades.com/");

    const query = `query GetCountries {
        countries {
            code
            name
            emoji
        }
    }`;


    // Query editor
    const editor = page.locator('section[aria-label="Query Editor"] .CodeMirror');
    await editor.click();
    await page.keyboard.press(isMac ? "Meta+A" : "Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.insertText(query);
    await page.locator("button.graphiql-execute-button").click();


  if (useMocks()) {
    // Assert mocked data appears in response panel
    await expect(page.getByText("India")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("United Kingdom")).toBeVisible({ timeout: 10_000 });
    console.log("Mocking mode; asserted mocked countries in UI.");
  } else {
    // In real network mode, just assert some country appears.
    await expect(page.getByText("Afghanistan")).toBeVisible({ timeout: 10_000 });
    console.log("Real network mode; asserted real country in UI.");
  }
});
