/** Lighthouse a11y + best-practices audit for /dashboard (PRD-04 acceptance). */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME_PATH =
  process.env.CHROME_PATH ??
  "/Users/josephle/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const MIN_SCORE = 95;
const DASHBOARD_URL = "http://localhost:5173/dashboard";

const APP = {
  id: "app1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Applied",
  date_applied: "2026-01-15T00:00:00Z",
  updated_at: "2026-03-20T00:00:00Z",
  source: "manual",
  stage_history: [{ stage: "Applied", transitioned_at: "2026-01-15T00:00:00Z" }],
  stages: ["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"],
};

const MOCK_ROUTES = {
  "/api/auth/me": { data: { id: "u1", email: "test@example.com", display_name: "Test" } },
  "/api/applications": { data: [APP], meta: { count: 1, next_cursor: null } },
  "/api/applications/stats": {
    data: {
      total_applied: 5,
      active_count: 3,
      response_rate: 0.4,
      avg_days_to_first_response: 7.2,
      stale_count: 0,
      applied_this_week: 2,
      current_streak: 1,
    },
  },
  "/api/applications/tags": { data: [] },
  "/api/notifications": { data: [], meta: { count: 0, unread: 0 } },
  "/api/notifications/unread-count": { data: { count: 0 } },
  "/api/templates/": { data: [] },
  "/api/contacts": { data: [] },
  "/api/calendar/events": { data: [], meta: { count: 0 } },
  "/api/autopilot/pending": { data: [] },
  "/api/agent/activity": { data: [], meta: { limit: 20 } },
  "/api/brief/today": {
    data: {
      date: "2026-01-01",
      summary_line: "",
      sections: {
        follow_ups: [],
        interviews: [],
        high_matches: [],
        pending_approvals: [],
      },
      missions: [],
      mission_progress: { cleared: 0, total: 0 },
    },
  },
  "/api/copilot/session": { data: { messages: [] } },
  "/api/email/gmail/status": { data: { connected: true } },
};

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function startMockApi() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const pathname = req.url?.split("?")[0] ?? "";
      const payload = MOCK_ROUTES[pathname];
      if (payload) {
        json(res, 200, payload);
        return;
      }
      if (pathname.startsWith("/api/")) {
        json(res, 200, { data: [] });
        return;
      }
      json(res, 404, { error: { message: "Not found" } });
    });
    server.listen(8000, "127.0.0.1", () => resolve(server));
  });
}

function waitForUrl(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 401) {
          resolve();
          return;
        }
      } catch {
        /* retry */
      }
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

function startViteDev() {
  return spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"], {
    cwd: ROOT,
    stdio: "pipe",
    env: { ...process.env, BROWSER: "none" },
  });
}

function runLighthouse() {
  const outPath = path.join(ROOT, ".lighthouse-dashboard.json");
  return new Promise((resolve, reject) => {
    const args = [
      "lighthouse",
      DASHBOARD_URL,
      "--chrome-path",
      CHROME_PATH,
      "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
      "--only-categories=accessibility,best-practices",
      "--output=json",
      `--output-path=${outPath}`,
      "--quiet",
      "--no-enable-error-reporting",
    ];
    const child = spawn("npx", args, {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, CHROME_PATH },
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`lighthouse exited ${code}`));
        return;
      }
      resolve(JSON.parse(fs.readFileSync(outPath, "utf8")));
    });
  });
}

async function main() {
  if (!fs.existsSync(CHROME_PATH)) {
    console.error(`Chrome not found at ${CHROME_PATH}. Run: npx playwright install chromium`);
    process.exit(1);
  }

  const mockApi = await startMockApi();
  const vite = startViteDev();

  try {
    await waitForUrl("http://127.0.0.1:5173/");
    await new Promise((r) => setTimeout(r, 2000));

    const report = await runLighthouse();
    const a11y = Math.round(report.categories.accessibility.score * 100);
    const bp = Math.round(report.categories["best-practices"].score * 100);

    console.log(`Accessibility: ${a11y}`);
    console.log(`Best Practices: ${bp}`);

    if (a11y < MIN_SCORE || bp < MIN_SCORE) {
      console.error(`Scores below ${MIN_SCORE} — fix issues before marking PRD complete.`);
      process.exit(1);
    }

    console.log(`PASS — both categories ≥ ${MIN_SCORE}`);
  } finally {
    vite.kill("SIGTERM");
    mockApi.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
