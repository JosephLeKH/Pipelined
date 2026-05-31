import { test, expect } from '@playwright/test';
import { authAsTestUser } from '../fixtures/auth';

/**
 * Golden Path 1: Add Application
 *
 * User logs in → navigates to dashboard → clicks "Add Application" → fills required fields
 * (role_title, company) → submits → verifies application appears in the dashboard.
 */

test('add application via modal', async ({ page }) => {
  // Setup: Register/login test user via API
  await authAsTestUser(page);

  // Navigate to dashboard (authenticated route)
  await page.goto('/dashboard');

  // Wait for dashboard to load (look for app grid or a "New Application" button)
  await page.waitForSelector('button:has-text("Add Application"), button:has-text("New"), [data-testid="add-app"]', {
    timeout: 10000,
  });

  // Click "Add Application" button to open modal
  const addButton = page.locator('button:has-text("Add Application"), button:has-text("New"), [data-testid="add-app"]').first();
  await addButton.click();

  // Modal should appear with form fields
  const modal = page.locator('[role="dialog"], .modal, [data-testid="add-app-modal"]').first();
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Fill required fields: role_title and company
  const roleInput = modal.locator('input[placeholder*="title" i], input[placeholder*="role" i], input[name*="role" i]').first();
  const companyInput = modal.locator('input[placeholder*="company" i], input[name*="company" i]').first();

  await roleInput.fill('Senior Software Engineer', { timeout: 5000 });
  await companyInput.fill('Acme Corporation', { timeout: 5000 });

  // Optionally fill other fields if visible
  const sourceSelect = modal.locator('select[name*="source" i], [role="combobox"][aria-label*="source" i]').first();
  if (await sourceSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sourceSelect.click();
    await page.locator('text=Manual').first().click();
  }

  // Submit form (look for "Add", "Create", "Submit" button in modal)
  const submitButton = modal.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("Submit")').first();
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  await submitButton.click();

  // Wait for modal to close
  await expect(modal).not.toBeVisible({ timeout: 5000 });

  // Wait for application to appear in the dashboard (either a card or row)
  // Look for the company name and role title in the grid
  const appCard = page.locator('text="Acme Corporation"').first();
  await expect(appCard).toBeVisible({ timeout: 10000 });

  // Verify the application is in the dashboard (basic check)
  await expect(page.locator('text="Senior Software Engineer"')).toBeVisible({ timeout: 5000 });
});
