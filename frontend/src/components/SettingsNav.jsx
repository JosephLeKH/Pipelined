/** Settings left rail — grouped sub-nav with active Cardinal marker. */

import { Link, useLocation } from "react-router-dom";

import { SETTINGS_NAV_GROUPS, getActiveSettingsSegment } from "../lib/settingsRoutes";

const NAV_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function NavRow({ item, isActive }) {
  const baseClass =
    "relative flex h-8 items-center gap-2 pl-4 pr-3 text-[13px] motion-reduce:transition-none transition-colors duration-hover ease-out";
  const stateClass = isActive
    ? "bg-surface-2 text-brand-600 font-medium"
    : "text-text-2 hover:bg-surface-2 hover:text-text-1";

  const content = (
    <>
      {isActive && (
        <span
          className="absolute left-0 top-0 h-full w-0.5 bg-brand-600"
          aria-hidden="true"
        />
      )}
      {item.label}
    </>
  );

  if (item.external) {
    return (
      <Link
        to={item.to}
        className={`${baseClass} ${stateClass} ${NAV_FOCUS_RING}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      to={item.to}
      aria-current={isActive ? "page" : undefined}
      className={`${baseClass} ${stateClass} ${NAV_FOCUS_RING}`}
    >
      {content}
    </Link>
  );
}

function SettingsNav() {
  const { pathname } = useLocation();
  const activeSegment = getActiveSettingsSegment(pathname);

  return (
    <nav
      aria-label="Settings sections"
      className="w-60 shrink-0 overflow-y-auto border-r border-border-1"
    >
      {SETTINGS_NAV_GROUPS.map((group) => (
        <div key={group.label} className="py-2">
          <p className="px-3 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-wide text-text-3">
            {group.label}
          </p>
          <ul className="flex flex-col">
            {group.items.map((item) => {
              const isActive = !item.external && activeSegment === item.segment;
              return (
                <li key={item.segment}>
                  <NavRow item={item} isActive={isActive} />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default SettingsNav;
