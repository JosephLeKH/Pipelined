/** Theme context: manages dark/light/system preference with localStorage persistence. */

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pipelined_theme";
const THEMES = ["system", "light", "dark"];

const ThemeContext = createContext(null);

function getSystemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function computeIsDark(theme) {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return getSystemPrefersDark();
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : "system";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", computeIsDark(theme));

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e) => {
        document.documentElement.classList.toggle("dark", e.matches);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = THEMES[(THEMES.indexOf(prev) + 1) % THEMES.length];
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
