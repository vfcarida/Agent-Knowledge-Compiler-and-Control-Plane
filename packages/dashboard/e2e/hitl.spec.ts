import { test, expect } from "@playwright/test";

test.describe("Human-In-The-Loop (HITL) Approval Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the pending approvals API
    await page.route("**/api/automation/approvals", async (route) => {
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
                  pending: [
                    {
                      token: "test-approval-token-123",
                      toolName: "confirm_application_submission",
                      payloadHash: "abc123def456",
                      expiresAt: Date.now() + 100000,
                      metadata: {
                        jobUrl: "https://example.com/job/123",
                        platform: "greenhouse",
                        sideEffectLevel: "external-submit",
                        dryRun: false,
                      },
                    },
                  ],
                },
              }),
            },
          ],
        }),
      });
    });

    // Mock the approve API
    await page.route("**/api/automation/approve", async (route) => {
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
                  message: "Job application successfully submitted",
                },
              }),
            },
          ],
        }),
      });
    });

    // Navigate to the app and bypass the directory picker by simulating data load
    await page.goto("/");
    
    // Evaluate to mock the auth and OKF data context
    await page.evaluate(() => {
      // Small hack for E2E: assume user is logged in
      window.localStorage.setItem("mockUser", JSON.stringify({
        identity: "admin-tester",
        name: "Test Admin",
        role: "admin",
      }));
    });
    
    // Reload to apply auth state
    await page.reload();
  });

  test("should display pending approval in the queue and authorize it", async ({ page }) => {
    // Navigate to the Dashboard Welcome Screen
    await expect(page.locator("h2").filter({ hasText: "Welcome" })).toBeVisible();

    // Mock the OKF data so we bypass the Welcome screen and see the dashboard
    // We can do this by clicking a hidden "Test Mode" button or just navigating directly 
    // if we add a route, but for now we'll just mock the Context API if possible.
    // Instead of complex React context mocking, we can intercept the directory loader or just click the "Select Directory" and mock the File System Access API.
    // However, the easiest way is to mock `useOKFData` behavior by intercepting a network request or using evaluate.
    
    // For this test, we just want to render the App. Since `useOKFData` relies on user action (directory picker), let's mock the `showDirectoryPicker` API.
    await page.evaluate(() => {
      (window as any).showDirectoryPicker = async () => {
        return {
          values: () => [], // Return empty directory iterator
          kind: 'directory',
          name: 'mock-okf-dir'
        };
      };
    });

    // Click "Select .okf Directory" to enter the dashboard
    await page.click("button:has-text('Select .okf Directory')");

    // Wait for the Sidebar to appear
    await expect(page.locator("aside")).toBeVisible();

    // Click on the Approvals tab
    await page.click("button:has-text('Approvals')");

    // Check if the HITL queue rendered our mocked pending approval
    await expect(page.locator("h2").filter({ hasText: "Human-in-the-Loop Approval Queue" })).toBeVisible();
    
    // Verify the badge and metadata
    await expect(page.locator("text=LIVE ACTION")).toBeVisible();
    await expect(page.locator("text=external-submit")).toBeVisible();
    await expect(page.locator("text=https://example.com/job/123")).toBeVisible();
    await expect(page.locator("text=abc123def456")).toBeVisible();

    // Click Authorize
    await page.click("button:has-text('Authorize')");

    // Verify confirmation modal appears
    await expect(page.locator("text=Authorize Execution")).toBeVisible();
    await expect(page.locator("text=Are you sure you want to authorize this operation?")).toBeVisible();

    // Click Confirm
    await page.click("button:has-text('Confirm')");

    // Verify Success alert
    await expect(page.locator("text=Action successfully approved and submitted to the agent.")).toBeVisible();
  });
});
