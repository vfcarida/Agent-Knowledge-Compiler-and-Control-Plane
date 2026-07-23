import { test, expect } from "@playwright/test";

test.describe("Context Packs Visual Inspection", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and bypass the directory picker by simulating data load
    await page.goto("/");
    
    // Evaluate to mock the auth
    await page.evaluate(() => {
      window.localStorage.setItem("mockUser", JSON.stringify({
        identity: "admin-tester",
        name: "Test Admin",
        role: "admin",
      }));
    });
    
    // Reload to apply auth state
    await page.reload();
  });

  test("should display Context Packs correctly based on mock manifest", async ({ page }) => {
    // Mock the showDirectoryPicker API so that `useOKFData` loads our mock manifest
    await page.evaluate(() => {
      (window as any).showDirectoryPicker = async () => {
        return {
          kind: 'directory',
          name: 'mock-okf-dir',
          values: async function* () {
            // Mock a root level manifest (as fallback)
            yield {
              kind: 'file',
              name: 'akcp-manifest.json',
              getFile: async () => new File([
                JSON.stringify({
                  schemaVersion: "akcp.artifact-manifest/v1",
                  createdAt: "2026-07-15T10:00:00Z",
                  source: {
                    config: "akcp.yaml",
                    hash: "mock-source-hash-123",
                    root: "/mock/root/dir"
                  },
                  targets: [
                    {
                      name: "mcp-resources",
                      type: "json",
                      outputs: ["resources.json"],
                      sizeBytes: 1024,
                      hash: "mock-target-hash-1"
                    }
                  ],
                  conformance: {
                    level: "L2_Standard",
                    passed: true,
                    diagnostics: []
                  }
                })
              ], 'akcp-manifest.json', { type: 'application/json' })
            };
          }
        };
      };
    });

    // Click "Select .okf Directory" to enter the dashboard
    await page.click("button:has-text('Select .okf Directory')");

    // Wait for the Sidebar to appear
    await expect(page.locator("aside")).toBeVisible();

    // Click on the Context Packs tab
    await page.click("button:has-text('Context Packs')");

    // Check if the Context Packs page rendered the correct headers
    await expect(page.locator("h2").filter({ hasText: "Compiled Targets (Manifest)" })).toBeVisible();
    
    // Verify manifest specific data
    await expect(page.locator("text=mock-source-hash-123")).toBeVisible();
    await expect(page.locator("text=mcp-resources")).toBeVisible();
  });
});
