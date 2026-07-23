import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Agent Knowledge Compiler and Control Plane/);
});

test("welcome screen renders correctly", async ({ page }) => {
  await page.goto("/");
  // Assert presence of the welcome heading
  await expect(page.locator("h2")).toContainText(
    "Welcome to Agent Knowledge Compiler and Control Plane",
  );
  // Assert presence of the Select directory button
  const button = page.locator("button", { hasText: "Select .okf Directory" });
  await expect(button).toBeVisible();
});
