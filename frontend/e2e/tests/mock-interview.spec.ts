import { test, expect } from '@playwright/test';
import { authAsTestUser } from '../fixtures/auth';
import { createTestApplication } from '../fixtures/test-data';

/**
 * Golden Path 5: Mock Interview
 *
 * User logs in → navigates to an application detail → opens mock interview tab/modal
 * → clicks "Start session" → answers one question → waits for debrief
 * → verifies debrief content visible → closes modal.
 *
 * NOTE: Mock interview is an SSE/streaming endpoint and may flake. Generous timeouts.
 */

test('mock interview: start session, answer question, view debrief', async ({ page }) => {
  // Setup: Register/login test user via API
  await authAsTestUser(page);

  // Seed a test application
  const app = await createTestApplication(page, {
    role_title: 'Software Engineer',
    company: 'InterviewCorp',
  });

  // Navigate to dashboard
  await page.goto('/dashboard');
  await page.waitForSelector('text="InterviewCorp"', { timeout: 10000 });

  // Click on application to open detail view / modal
  const appCard = page.locator('text="InterviewCorp"').first();
  await appCard.click();

  // Wait for detail modal / page
  await page.waitForSelector('[data-testid="app-detail"], [role="dialog"], .app-modal', { timeout: 5000 });

  // Look for mock interview tab or button
  let mockInterviewButton = page.locator(
    'button:has-text("Interview"), button:has-text("Mock"), button:has-text("Practice"), [data-testid="mock-interview"]',
  ).first();

  // If in a tabbed interface, click the "Interview" tab
  const interviewTab = page.locator('[role="tab"]:has-text("Interview"), button:has-text("Interview")').first();
  if (await interviewTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await interviewTab.click();
    mockInterviewButton = page.locator('button:has-text("Start"), button:has-text("Begin"), [data-testid="start-interview"]').first();
  }

  // Click "Start Session" button
  await expect(mockInterviewButton).toBeVisible({ timeout: 5000 });
  await mockInterviewButton.click();

  // Wait for interview UI to appear (question + input field)
  const questionContainer = page.locator('[data-testid="question"], .interview-question, .mock-interview-container').first();
  await expect(questionContainer).toBeVisible({ timeout: 10000 });

  // Verify a question is displayed
  const questionText = page.locator('[data-testid="question"], .interview-question h2, .interview-question p').first();
  await expect(questionText).toBeVisible({ timeout: 5000 });

  // Find the answer input field (textarea or input)
  const answerInput = page.locator(
    'textarea[placeholder*="answer" i], textarea[placeholder*="response" i], input[placeholder*="answer" i], [data-testid="answer-input"]',
  ).first();

  if (await answerInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Type an answer
    await answerInput.fill('This is my answer to the interview question. I am prepared and confident.');

    // Look for "Submit", "Next", "Continue" button
    const submitButton = page.locator(
      'button:has-text("Submit"), button:has-text("Next"), button:has-text("Continue"), [data-testid="submit-answer"]',
    ).first();

    if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();
    } else {
      // Try Enter key
      await answerInput.press('Enter');
    }
  }

  // Wait for debrief to appear (can take up to 15 seconds for SSE completion)
  const debrief = page.locator(
    '[data-testid="debrief"], .debrief, .interview-debrief, [role="region"]:has-text("Feedback")',
  ).first();

  await expect(debrief).toBeVisible({ timeout: 20000 });

  // Verify debrief contains expected content (feedback, scores, etc.)
  await expect(debrief).toContainText(/feedback|score|strength|improvement|congratulation/i);

  // Optional: Verify a "Close" button exists
  const closeButton = page.locator('button:has-text("Close"), button:has-text("Done"), [aria-label="close"]').first();
  if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeButton.click();
    // Verify modal closes
    await expect(debrief).not.toBeVisible({ timeout: 5000 });
  }
});
