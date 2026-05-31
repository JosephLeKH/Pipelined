import { Page, expect } from '@playwright/test';

/**
 * Auth fixture helpers for Playwright E2E tests.
 *
 * Handles test user creation and login. Reads TEST_USER_EMAIL and TEST_USER_PASSWORD
 * from env, or generates a unique email per run (e2e-test-${timestamp}@example.com).
 */

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || `e2e-test-${Date.now()}@example.com`;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPass123!';
const TEST_USER_DISPLAY_NAME = 'E2E Test User';

export interface TestUser {
  id: string;
  email: string;
  display_name: string;
}

/**
 * Register a test user via /api/auth/register. Returns user object and cookies.
 * Side effect: Sets access_token and refresh_token cookies in the page context.
 */
export async function registerTestUser(page: Page): Promise<TestUser> {
  const response = await page.request.post('/api/auth/register', {
    data: {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      display_name: TEST_USER_DISPLAY_NAME,
      referral_code: null,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to register test user: ${response.status()} ${response.statusText()}`);
  }

  const body = await response.json();
  const user = body.data as TestUser;

  // Extract cookies from response headers and store in browser context.
  const setCookieHeaders = response.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
  for (const header of setCookieHeaders) {
    const [cookieStr] = header.value.split(';');
    const [name, value] = cookieStr.split('=');
    await page.context().addCookies([
      {
        name: name.trim(),
        value: value.trim(),
        url: page.url(),
      },
    ]);
  }

  return user;
}

/**
 * Login as a test user via /api/auth/login. Returns user object and sets cookies.
 * Prerequisites: User must already exist.
 */
export async function loginTestUser(page: Page, email = TEST_USER_EMAIL, password = TEST_USER_PASSWORD): Promise<TestUser> {
  const response = await page.request.post('/api/auth/login', {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Failed to login test user: ${response.status()} ${response.statusText()}`);
  }

  const body = await response.json();
  const user = body.data as TestUser;

  // Extract cookies and store in browser context.
  const setCookieHeaders = response.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
  for (const header of setCookieHeaders) {
    const [cookieStr] = header.value.split(';');
    const [name, value] = cookieStr.split('=');
    await page.context().addCookies([
      {
        name: name.trim(),
        value: value.trim(),
        url: page.url(),
      },
    ]);
  }

  return user;
}

/**
 * Helper: register or login (uses env vars if set, otherwise creates unique test user).
 * Handles duplicate email gracefully by logging in instead.
 */
export async function authAsTestUser(page: Page): Promise<TestUser> {
  try {
    return await registerTestUser(page);
  } catch (error: any) {
    // If user already exists (duplicate email), try login instead.
    if (error.message.includes('409') || error.message.includes('DUPLICATE_EMAIL')) {
      return await loginTestUser(page);
    }
    throw error;
  }
}

/**
 * Helper: Navigate to /login, fill email/password, and submit.
 * Waits for redirect to /dashboard or authenticated route.
 */
export async function loginViaUI(page: Page, email = TEST_USER_EMAIL, password = TEST_USER_PASSWORD) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Sign in")');
  // Wait for redirect — either /dashboard or /today (home route for authenticated users).
  await page.waitForURL(url => url.pathname === '/dashboard' || url.pathname === '/today' || url.pathname.startsWith('/'));
  await expect(page).not.toHaveURL('/login');
}

/**
 * Verify user is logged in by checking for authenticated UI elements (e.g., user menu).
 */
export async function assertUserLoggedIn(page: Page) {
  // Check for presence of authenticated-only UI. Adjust selector as needed based on your app structure.
  await expect(page.locator('[data-testid="user-menu"], button:has-text("Settings"), [aria-label*="user" i]').first()).toBeVisible({
    timeout: 5000,
  });
}
