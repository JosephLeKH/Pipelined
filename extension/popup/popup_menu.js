/** User menu dropdown for authenticated popup header. */

export function closeUserMenu() {
  const dropdown = document.getElementById("user-dropdown");
  const trigger = document.getElementById("user-menu-trigger");
  if (dropdown) dropdown.classList.add("hidden");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

function toggleUserMenu() {
  const dropdown = document.getElementById("user-dropdown");
  const trigger = document.getElementById("user-menu-trigger");
  if (!dropdown || !trigger) return;
  const hidden = dropdown.classList.toggle("hidden");
  trigger.setAttribute("aria-expanded", String(!hidden));
}

/**
 * @param {() => void|Promise<void>} onSignOut
 */
export function setupUserMenu(onSignOut) {
  const menu = document.getElementById("user-menu");
  const trigger = document.getElementById("user-menu-trigger");
  const signOutBtn = document.getElementById("sign-out");
  if (menu) menu.classList.remove("hidden");
  if (trigger) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleUserMenu();
    });
  }
  if (signOutBtn) signOutBtn.addEventListener("click", onSignOut);
  document.addEventListener("click", closeUserMenu);
}
