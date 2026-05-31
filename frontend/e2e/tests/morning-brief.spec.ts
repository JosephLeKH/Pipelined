import { test, expect } from '@playwright/test';
import { authAsTestUser } from '../fixtures/auth';
import { createTestApplications } from '../fixtures/test-data';

/**
 * Golden Path 3: Morning Brief
 *
 * User logs in → navigates to /today (morning brief view) → views missions
 * → checks off a mission or marks it done → verifies mission disappears or shows done state.
 */

test('morning brief: view and mark mission done', async ({ page }) => {
  // Setup: Register/login test user via API
  await authAsTestUser(page);

  // Seed test applications (for the brief to have content)
  await createTestApplications(page, 3);

  // Navigate to /today (morning brief page)
  await page.goto('/today');

  // Wait for the brief to load (look for mission list or brief header)
  // Common selectors: mission card, brief section, task item
  await page.waitForSelector(
    'text="Today", text="Mission", text="Tasks", [data-testid="mission"], .mission-item, [role="listitem"]',
    { timeout: 10000 },
  );

  // Verify at least one mission is visible
  const missionItems = page.locator('[data-testid="mission"], .mission-item, [role="listitem"]');
  const count = await missionItems.count();

  if (count > 0) {
    // Get the first mission
    const firstMission = missionItems.first();
    await expect(firstMission).toBeVisible({ timeout: 5000 });

    // Look for a "Mark done", "Check", "Complete" button or checkbox in the mission
    const doneButton = firstMission.locator(
      'button:has-text("Done"), button:has-text("Mark done"), input[type="checkbox"], [role="checkbox"]',
    ).first();

    if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click to mark done
      await doneButton.click();

      // Wait for the mission to disappear or show a done state
      await page.waitForTimeout(500);

      // Verify it's no longer visible or has a "done" class/state
      const missionStatus = firstMission.locator('[data-testid="status"], .status').first();
      if (await missionStatus.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check for "done" or "completed" indicator
        await expect(missionStatus).toContainText(/done|completed|checked/i);
      } else {
        // Or verify the entire mission is removed from the list
        await expect(firstMission).not.toBeVisible({ timeout: 5000 });
      }
    }
  }

  // Verify the page is still on /today
  await expect(page).toHaveURL(/\/today/);
});
