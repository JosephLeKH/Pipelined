/** Tailwind CSS configuration for Pipelined frontend — Cardinal + Linear redesign */
import animatePlugin from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* Brand palette — Stanford Cardinal Red #8C1515 + tints/shades */
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          900: "var(--brand-900)",
        },
        /* Surface layers — light mode white, dark mode near-black */
        "surface-0": "var(--surface-0)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        /* Text colors — primary, secondary, tertiary, disabled */
        "text-1": "var(--text-1)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        "text-4": "var(--text-4)",
        /* Borders — default, strong, focus */
        "border-1": "var(--border-1)",
        "border-2": "var(--border-2)",
        "border-3": "var(--border-3)",
        /* Status colors — for dots, badges, charts */
        "status-neutral": "var(--status-neutral)",
        "status-info": "var(--status-info)",
        "status-violet": "var(--status-violet)",
        "status-warn": "var(--status-warn)",
        "status-orange": "var(--status-orange)",
        "status-success": "var(--status-success)",
        "status-muted": "var(--status-muted)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        /* Typography scale — Linear style, body 13px base */
        xs: ["0.75rem", { lineHeight: "1.2", fontWeight: "500" }], /* label */
        sm: ["0.8125rem", { lineHeight: "1.45", fontWeight: "400" }], /* body */
        base: ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }], /* body-sm */
        lg: ["0.875rem", { lineHeight: "1.35", fontWeight: "600" }], /* heading-3 */
        xl: ["1rem", { lineHeight: "1.3", fontWeight: "600" }], /* heading-2 */
        "2xl": ["1.25rem", { lineHeight: "1.25", fontWeight: "600" }], /* heading-1 */
        "3xl": ["1.75rem", { lineHeight: "1.15", fontWeight: "600" }], /* display-md */
        "4xl": ["2.25rem", { lineHeight: "1.1", fontWeight: "600" }], /* display-lg */
        "5xl": ["3rem", { lineHeight: "1.05", fontWeight: "600" }], /* display-xl */
      },
      boxShadow: {
        popover: "var(--shadow-popover)",
        modal: "var(--shadow-modal)",
      },
      borderRadius: {
        sm: "4px", /* badges, dots */
        md: "6px", /* buttons, inputs */
        lg: "8px", /* cards */
        xl: "12px", /* modals, drawers */
      },
      transitionDuration: {
        "hover-text": "100ms",
        "hover": "120ms",
        "modal": "180ms",
        "drawer": "220ms",
      },
      keyframes: {
        /* Motion tokens from PRD-00 */
        slideUp: {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideInRight: {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        missionComplete: {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0.5", transform: "translateY(6px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "slide-up": "slideUp 220ms cubic-bezier(0.22, 0.61, 0.36, 1)",
        "scale-in": "scaleIn 180ms ease-out",
        "fade-in": "fadeIn 180ms ease-out",
        "slide-in-right": "slideInRight 220ms ease-out",
        "fade-in-up": "fadeInUp 180ms ease-out forwards",
        "mission-complete": "missionComplete 280ms ease-out forwards",
        "pulse-soft": "pulseSoft 1.4s ease-in-out infinite",
      },
      spacing: {
        "0.5": "2px",
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "6": "24px",
        "8": "32px",
        "12": "48px",
        "16": "64px",
      },
    },
  },
  plugins: [animatePlugin],
};
