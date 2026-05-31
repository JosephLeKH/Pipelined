import { Page } from '@playwright/test';

/**
 * Test data fixture helpers for Playwright E2E tests.
 *
 * Provides functions to seed test applications and other data via the API.
 * These are called from individual tests to ensure test data isolation.
 */

export interface TestApplication {
  id: string;
  role_title: string;
  company: string;
  stage: string;
  url?: string;
  notes?: string;
}

/**
 * Create a test application via /api/applications.
 * Returns the created application document.
 */
export async function createTestApplication(
  page: Page,
  overrides?: Partial<TestApplication>,
): Promise<TestApplication> {
  const defaults = {
    role_title: 'Software Engineer',
    company: 'Test Company',
    source: 'manual',
    stage: 'Interested',
    ...overrides,
  };

  const response = await page.request.post('/api/applications', {
    data: defaults,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test application: ${response.status()} ${response.statusText()}`);
  }

  const body = await response.json();
  return body.data as TestApplication;
}

/**
 * Create multiple test applications for seeding.
 */
export async function createTestApplications(
  page: Page,
  count: number = 5,
  overrides?: Partial<TestApplication>,
): Promise<TestApplication[]> {
  const apps: TestApplication[] = [];
  for (let i = 0; i < count; i++) {
    const app = await createTestApplication(page, {
      role_title: `Software Engineer (${i + 1})`,
      company: `Test Company ${i + 1}`,
      ...overrides,
    });
    apps.push(app);
  }
  return apps;
}

/**
 * Update an application's stage via PATCH /api/applications/{id}.
 * Used to move applications between pipeline stages.
 */
export async function updateApplicationStage(page: Page, applicationId: string, stage: string): Promise<TestApplication> {
  const response = await page.request.patch(`/api/applications/${applicationId}`, {
    data: { stage },
  });

  if (!response.ok()) {
    throw new Error(`Failed to update application stage: ${response.status()} ${response.statusText()}`);
  }

  const body = await response.json();
  return body.data as TestApplication;
}

/**
 * Get an application by ID via GET /api/applications/{id}.
 */
export async function getApplication(page: Page, applicationId: string): Promise<TestApplication> {
  const response = await page.request.get(`/api/applications/${applicationId}`);

  if (!response.ok()) {
    throw new Error(`Failed to get application: ${response.status()} ${response.statusText()}`);
  }

  const body = await response.json();
  return body.data as TestApplication;
}

/**
 * List all applications via GET /api/applications.
 */
export async function listApplications(page: Page): Promise<TestApplication[]> {
  const response = await page.request.get('/api/applications');

  if (!response.ok()) {
    throw new Error(`Failed to list applications: ${response.status()} ${response.statusText()}`);
  }

  const body = await response.json();
  return body.data as TestApplication[];
}
