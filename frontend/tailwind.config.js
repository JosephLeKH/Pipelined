/** Tailwind CSS configuration for Pipelined frontend. */
import defaultTheme from "tailwindcss/defaultTheme";
import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand palette — Anthropic clay orange
        brand: {
          50: "#fdf3ee",
          100: "#fae4d4",
          200: "#f5c9aa",
          300: "#eeac80",
          400: "#e48f5a",
          500: "#d97757",
          600: "#c4673a",
          700: "#a35430",
          800: "#7d4127",
          900: "#5c3020",
          950: "#3a1e13",
        },
        // Warm gray palette — Anthropic brand neutrals
        gray: {
          50: "#faf9f5",
          100: "#f5f0e8",
          200: "#e8e6dc",
          300: "#d4ccbd",
          400: "#b0aea5",
          500: "#6b5f4e",
          600: "#4a4139",
          700: "#332d26",
          800: "#1f1b17",
          900: "#141413",
          950: "#0d0c0b",
        },
        // Secondary accent colors
        "accent-blue": "#6a9bcc",
        "accent-green": "#788c5d",
        // Semantic tokens — surfaces
        "surface-primary": "#ffffff",
        "surface-secondary": "#faf9f5",
        "surface-tertiary": "#e8e6dc",
        // Semantic tokens — borders
        "border-default": "rgba(120,100,75,0.12)",
        "border-strong": "rgba(120,100,75,0.24)",
        // Dark mode semantic tokens
        dark: {
          bg: "#141413",
          surface: "#1c1c1a",
          accent: "#d97757",
          text: "#e8e4de",
          "text-secondary": "#b0aea5",
          border: "rgba(255,255,255,0.08)",
        },
        // Semantic colors
        success: colors.emerald[500],
        warning: colors.amber[500],
        danger: colors.rose[500],
        info: "#6a9bcc",
      },
      fontFamily: {
        sans: ["Lora", "Georgia", "serif"],
        display: ["Poppins", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(120,100,75,0.06)",
        "card-hover": "0 2px 8px rgba(120,100,75,0.08)",
        modal: "0 20px 60px rgba(20,20,19,0.15)",
      },
      keyframes: {
        slideInRight: {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "slide-in-right": "slideInRight 0.25s ease-out",
      },
      borderRadius: {
        card: "0.75rem",
        button: "0.375rem",
        badge: "9999px",
        input: "0.5rem",
      },
    },
  },
  plugins: [],
};
