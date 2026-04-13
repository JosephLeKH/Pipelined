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
        // Brand palette — indigo-to-violet identity
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          950: "#1E1B4B",
        },
        // Semantic colors
        accent: colors.amber[500],
        success: colors.emerald[500],
        warning: colors.amber[500],
        danger: colors.rose[500],
        info: colors.sky[500],
        // Alias gray → slate for warmer, more professional neutrals
        gray: colors.slate,
      },
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)",
        modal: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.08)",
        glow: "0 0 20px -5px rgb(99 102 241 / 0.3)",
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
        button: "0.5rem",
        badge: "9999px",
        input: "0.5rem",
      },
    },
  },
  plugins: [],
};
