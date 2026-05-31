import { test, expect } from '@playwright/test';
import { authAsTestUser } from '../fixtures/auth';
import { createTestApplication } from '../fixtures/test-data';

/**
 * Golden Path 4: Co-pilot Chat
 *
 * User logs in → opens Co-pilot drawer/modal → types a message → submits
 * → waits for SSE response → asserts assistant message visible
 * → optionally clicks a suggested action.
 *
 * NOTE: SSE responses may flake without proper mocking. This test uses generous timeouts.
 */

test('copilot chat: send message and receive streaming response', async ({ page }) => {
  // Setup: Register/login test user via API
  await authAsTestUser(page);

  // Seed a test application for context
  const app = await createTestApplication(page, {
    role_title: 'Data Scientist',
    company: 'DataCorp',
  });

  // Navigate to an application detail page (for Co-pilot context)
  // Typically /dashboard or /applications/{id}
  await page.goto('/dashboard');
  await page.waitForSelector('text="DataCorp"', { timeout: 10000 });

  // Click on the application to open detail view (if modal)
  const appCard = page.locator('text="DataCorp"').first();
  await appCard.click();

  // Wait for detail view / modal to appear
  await page.waitForSelector('[data-testid="app-detail"], [role="dialog"]', { timeout: 5000 });

  // Look for Co-pilot button or drawer trigger
  // Common selectors: "Ask Co-pilot", icon button, chat icon
  let copilotButton = page.locator(
    'button:has-text("Co-pilot"), button:has-text("Chat"), button[aria-label*="copilot" i], [data-testid="copilot-btn"]',
  ).first();

  if (!await copilotButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    // If not in modal, try dashboard level
    await page.goto('/dashboard');
    copilotButton = page.locator(
      'button:has-text("Co-pilot"), button:has-text("Chat"), button[aria-label*="copilot" i], [data-testid="copilot-btn"]',
    ).first();
  }

  // Open Co-pilot drawer if button found
  if (await copilotButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await copilotButton.click();
  }

  // Wait for Co-pilot chat UI to appear
  const chatInput = page.locator(
    'input[placeholder*="message" i], textarea[placeholder*="message" i], [data-testid="copilot-input"], .chat-input input',
  ).first();
  await expect(chatInput).toBeVisible({ timeout: 10000 });

  // Type a message
  const testMessage = 'What should I prepare for the interview?';
  await chatInput.fill(testMessage);

  // Submit message (Enter key or Send button)
  const sendButton = page.locator(
    'button:has-text("Send"), button:has-text("Submit"), [data-testid="send"]',
  ).first();

  if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await sendButton.click();
  } else {
    // Try Enter key
    await chatInput.press('Enter');
  }

  // Wait for the user message to appear in chat
  await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });

  // Wait for assistant message (SSE response can take up to 10 seconds)
  // Look for a message from the assistant with any content
  const assistantMessage = page.locator(
    '[data-testid="assistant-message"], .message.assistant, .chat-message:has-text("Co-pilot"):right-of(text="' + testMessage + '")',
  ).first();

  await expect(assistantMessage).toBeVisible({ timeout: 15000 });

  // Optional: Click a suggested action button if present
  const suggestedActionButton = page.locator(
    'button[data-action], button:has-text("Move"), button:has-text("Apply"), .suggested-action button',
  ).first();

  if (await suggestedActionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Just verify it exists; don't click to avoid side effects
    await expect(suggestedActionButton).toBeVisible();
  }

  // Verify chat is still visible
  await expect(chatInput).toBeVisible();
});
