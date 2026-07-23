import { test, expect } from "@playwright/test";

test.describe("Audit Log Visual Inspection", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the audit logs API
    await page.route("**/api/audit/logs", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isError: false,
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: true,
                data: {
                  logs: [
                    {
                      schemaVersion: "akcp.audit/v1",
                      eventId: "event-1",
                      timestamp: new Date(Date.now() - 1000).toISOString(),
                      requestId: "req-1",
                      actor: "test-user@corp.com",
                      action: "mcp-tool-call",
                      capabilityId: "delete_database",
                      decision: "deny",
                      riskLevel: "high",
                      evidence: {
                        payloadHash: "deadbeef",
                        reason: "Policy violation: destructive action"
                      }
                    },
                    {
                      schemaVersion: "akcp.audit/v1",
                      eventId: "event-2",
                      timestamp: new Date(Date.now() - 2000).toISOString(),
                      requestId: "req-2",
                      actor: "test-user@corp.com",
                      action: "mcp-tool-call",
                      capabilityId: "read_logs",
                      decision: "allow",
                      riskLevel: "low",
                      evidence: {
                        payloadHash: "cafebabe"
                      }
                    }
                  ]
                }
              })
            }
          ]
        })
      });
    });

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

  test("should display audit logs with correct badges", async ({ page }) => {
    // Mock the showDirectoryPicker API so we can pass the welcome screen
    await page.evaluate(() => {
      (window as any).showDirectoryPicker = async () => {
        return {
          kind: 'directory',
          name: 'mock-okf-dir',
          values: async function* () {} // empty directory
        };
      };
    });

    // Click "Select .okf Directory" to enter the dashboard
    await page.click("button:has-text('Select .okf Directory')");

    // Wait for the Sidebar to appear
    await expect(page.locator("aside")).toBeVisible();

    // Click on the Audit Log tab
    await page.click("button:has-text('Audit Log')");

    // Check if the Audit Logs page rendered
    await expect(page.locator("h2").filter({ hasText: "Audit Log" })).toBeVisible();
    
    // Verify specific log contents
    await expect(page.locator("text=test-user@corp.com").first()).toBeVisible();
    await expect(page.locator("text=delete_database")).toBeVisible();
    await expect(page.locator("text=read_logs")).toBeVisible();
    
    // Verify badges (deny vs allow)
    await expect(page.locator("text=deny")).toBeVisible();
    await expect(page.locator("text=allow")).toBeVisible();
  });
});
