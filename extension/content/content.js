/** Content script entry: detects job pages, extracts data, injects banner. */

// Board modules are loaded here; implementations come in later stories.
const BOARDS = [];

const BANNER_AUTO_DISMISS_MS = 8000;

function init() {
  const board = BOARDS.find((b) => b.isJobPage());
  if (!board) return;

  const fields = board.extractFields();
  if (!fields.role_title && !fields.company_name) {
    return;
  }

  injectBanner(fields, board.BOARD_ID);
}

function injectBanner(fields, boardId) {
  const host = document.createElement("pipelined-banner");
  const shadow = host.attachShadow({ mode: "closed" });

  const container = document.createElement("div");
  container.className = "pipelined-banner";
  container.setAttribute("role", "alert");
  container.setAttribute("aria-live", "polite");
  shadow.appendChild(container);

  document.body.appendChild(host);

  const timer = setTimeout(() => dismiss(host), BANNER_AUTO_DISMISS_MS);

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        clearTimeout(timer);
        dismiss(host);
      }
    },
    { once: true }
  );
}

function dismiss(host) {
  host.style.opacity = "0";
  host.style.transition = "opacity 300ms ease";
  setTimeout(() => host.remove(), 300);
}

if (document.readyState === "complete") {
  init();
} else {
  window.addEventListener("load", init, { once: true });
}
