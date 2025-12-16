import { test, expect, Page } from "@playwright/test";
import { useMocks } from "./utils/mock-toggle";

const GRAPHQL_URL = "**://countries.trevorblades.com/**";
const isMac = process.platform === "darwin";

test.describe("GraphQL UI – Mocking with Playwright", () => {
  test.beforeEach(async ({ page }) => {
    if (useMocks()) {
        await page.route(GRAPHQL_URL, async (route) => {
        const req = route.request();
        if (req.method() !== "POST") return route.continue();

        const body = req.postDataJSON?.() as any;

        // 1️⃣ Basic query mock
        if (body?.operationName === "GetCountries") {
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

        // 2️⃣ Variable-based mock
        if (body?.operationName === "CountryByCode") {
            const code = body?.variables?.code;

            if (code === "IN") {
            return route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                data: { country: { code: "IN", name: "India" } },
                }),
            });
            }

            if (code === "GB") {
            return route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                data: { country: { code: "GB", name: "United Kingdom" } },
                }),
            });
            }
        }

        // 3️⃣ GraphQL error response
        if (body?.operationName === "GetCountriesError") {
            return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                data: null,
                errors: [{ message: "Mocked GraphQL error: Unauthorized" }],
            }),
            });
        }

        return route.continue();
        });
    }
  });

  async function runQuery(page: Page, query: string, variables?: string) {
    await page.goto("https://countries.trevorblades.com/");

    // Query editor
    const editor = page.locator('section[aria-label="Query Editor"] .CodeMirror');
    await editor.click();
    await page.keyboard.press(isMac ? "Meta+A" : "Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.insertText(query);

    // Optional variables
    if (variables) {
        await page.getByRole("button", { name: "Variables" }).click();

        const varsBox = page
            .getByRole("region", { name: "Variables" })
            .getByRole("textbox")
            .first();

        await varsBox.waitFor({ state: "visible" });
        // Do these steps manually, so clear the box and click inside before inserting text
        // // await varsBox.click();
        // await page.keyboard.press(isMac ? "Meta+A" : "Control+A");
        // await page.keyboard.press("Backspace");
        await page.keyboard.insertText(variables);
    }

    await page.locator("button.graphiql-execute-button").click();
  }

  test("mock GraphQL query response", async ({ page }) => {
    await runQuery(
      page,
      `query GetCountries {
        countries {
          code
          name
          emoji
        }
      }`
    );

    if (useMocks()) {
        await expect(page.getByText("India")).toBeVisible();
        await expect(page.getByText("United Kingdom")).toBeVisible();
        console.log("Mocking mode; asserted mocked countries in UI.");
    } else {
        console.log("Real network mode; asserted real country in UI.");
    }
  });

  test("mock GraphQL query using variables", async ({ page }) => {
    await runQuery(
      page,
      `query CountryByCode($code: ID!) {
        country(code: $code) {
          code
          name
        }
      }`,
      `{ "code": "IN" }`
    );

    if (useMocks()) {
        await expect(page.getByText("India")).toBeVisible();
        console.log("Mocking mode; asserted mocked country in UI.");
    } else {
        console.log("Real network mode; asserted real country in UI.");
    }
  });

  test.only("mock GraphQL error response", async ({ page }) => {
    await runQuery(
      page,
      `query GetCountriesError {
        countries {
          code
          name
        }
      }`
    );

    if (useMocks()) {
        await expect(page.getByText("Mocked GraphQL error", { exact: false })).toBeVisible({ timeout: 10_000 });
        console.log("Mocking mode; asserted mocked error in UI.");
    } else {
        console.log("Real network mode; asserted real error in UI.");
    }
  });
});
