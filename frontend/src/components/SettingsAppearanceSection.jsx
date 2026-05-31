/** Settings appearance — theme, density, font size, and accent preferences. */

import { useCallback, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTheme } from "../context/ThemeContext";
import { useAppearancePrefs } from "../hooks/useAppearancePrefs";
import {
  ACCENTS,
  DENSITIES,
  FONT_SIZE_STEPS,
  applyDensity,
  applyFontSizeIndex,
  applyAccent,
  readDensity,
  readFontSizeIndex,
  readAccent,
} from "../lib/appearancePrefs";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

const THEME_OPTIONS = [
  { value: "light", label: "Light", previewClass: "bg-white border-border-2" },
  { value: "dark", label: "Dark", previewClass: "bg-[#08090a] border-border-2" },
  { value: "system", label: "Match system", previewClass: "bg-gradient-to-br from-white to-[#08090a] border-border-2" },
];

const DENSITY_OPTIONS = [
  { value: "comfortable", label: "Comfortable", help: "40 px row height" },
  { value: "compact", label: "Compact", help: "36 px row height (default)" },
];

const ACCENT_OPTIONS = [
  { value: "cardinal", label: "Cardinal", swatch: "bg-brand-600" },
  { value: "default", label: "Default (system)", swatch: "bg-text-3" },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 dark:focus-visible:ring-1 dark:focus-visible:ring-offset-1";

function SettingsFieldBlock({ label, help, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.8125rem] font-medium text-text-1">{label}</span>
      {children}
      {help ? <p className="mt-1 text-xs text-text-3">{help}</p> : null}
    </div>
  );
}

function ThemeSwatch({ option, checked, onSelect }) {
  return (
    <label
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg p-2 motion-reduce:transition-none transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
    >
      <input
        type="radio"
        name="appearance-theme"
        value={option.value}
        checked={checked}
        onChange={() => onSelect(option.value)}
        className="sr-only"
      />
      <span
        className={`h-14 w-14 rounded-lg border ${option.previewClass} ${checked ? "ring-2 ring-brand-600 ring-offset-2 dark:ring-1 dark:ring-offset-1" : ""}`}
        aria-hidden="true"
      />
      <span className="text-[0.8125rem] text-text-1">{option.label}</span>
    </label>
  );
}

function SettingsAppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { prefs, updatePrefs } = useAppearancePrefs();
  const [density, setDensity] = useState(() => prefs.density || readDensity());
  const [fontSizeIndex, setFontSizeIndex] = useState(() => prefs.font_size ?? readFontSizeIndex());
  const [accent, setAccent] = useState(() => prefs.accent_color || readAccent());

  useEffect(() => {
    if (prefs.density) setDensity(prefs.density);
    if (prefs.font_size !== undefined && prefs.font_size !== null) setFontSizeIndex(prefs.font_size);
    if (prefs.accent_color) setAccent(prefs.accent_color);
  }, [prefs]);

  const handleTheme = useCallback(
    (next) => {
      setTheme(next);
    },
    [setTheme],
  );

  const handleDensity = useCallback((next) => {
    setDensity(next);
    applyDensity(next);
    updatePrefs({ density: next });
  }, [updatePrefs]);

  const handleFontSize = useCallback((event) => {
    const index = Number(event.target.value);
    setFontSizeIndex(index);
    applyFontSizeIndex(index);
    updatePrefs({ font_size: index });
  }, [updatePrefs]);

  const handleAccent = useCallback((next) => {
    setAccent(next);
    applyAccent(next);
    updatePrefs({ accent_color: next });
  }, [updatePrefs]);

  return (
    <div>
      <h2 className="text-display-md text-text-1">Appearance</h2>
      <p className="mt-6 text-sm text-text-2">
        Customize theme, density, font size, and accent color.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <SettingsFieldBlock label="Theme" help="Applies immediately across the app.">
          <div className="flex flex-wrap gap-4" role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((option) => (
              <ThemeSwatch
                key={option.value}
                option={option}
                checked={theme === option.value}
                onSelect={handleTheme}
              />
            ))}
          </div>
        </SettingsFieldBlock>

        <div className="border-t border-border-1 pt-8" aria-hidden="true" />

        <SettingsFieldBlock label="Density" help="Controls list row height across pipeline, jobs, and missions.">
          <RadioGroup className="flex-row flex-wrap gap-4">
            {DENSITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 motion-reduce:transition-none transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
              >
                <RadioGroupItem
                  name="appearance-density"
                  value={option.value}
                  checked={density === option.value}
                  onChange={() => handleDensity(option.value)}
                />
                <span className="text-[0.8125rem] text-text-1">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        </SettingsFieldBlock>

        <div className="border-t border-border-1 pt-8" aria-hidden="true" />

        <SettingsFieldBlock
          label="Font size"
          help={`Base size: ${FONT_SIZE_STEPS[fontSizeIndex]} px`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-3">Small</span>
            <input
              type="range"
              min={0}
              max={FONT_SIZE_STEPS.length - 1}
              step={1}
              value={fontSizeIndex}
              onChange={handleFontSize}
              aria-label="Font size"
              aria-valuemin={0}
              aria-valuemax={FONT_SIZE_STEPS.length - 1}
              aria-valuenow={fontSizeIndex}
              className={`h-1.5 w-full max-w-xs cursor-pointer accent-brand-600 ${FOCUS_RING}`}
            />
            <span className="text-xs text-text-3">Large</span>
          </div>
        </SettingsFieldBlock>

        <div className="border-t border-border-1 pt-8" aria-hidden="true" />

        <SettingsFieldBlock label="Accent" help="Cardinal is the Pipelined brand default.">
          <RadioGroup className="flex-row flex-wrap gap-4">
            {ACCENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 motion-reduce:transition-none transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
              >
                <RadioGroupItem
                  name="appearance-accent"
                  value={option.value}
                  checked={accent === option.value}
                  onChange={() => handleAccent(option.value)}
                />
                <span
                  className={`h-4 w-4 shrink-0 rounded-full ${option.swatch}`}
                  aria-hidden="true"
                />
                <span className="text-[0.8125rem] text-text-1">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        </SettingsFieldBlock>
      </div>
    </div>
  );
}

export default SettingsAppearanceSection;
