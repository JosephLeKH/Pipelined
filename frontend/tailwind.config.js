/** Tailwind CSS configuration for Pipelined frontend. */
import defaultTheme from "tailwindcss/defaultTheme";
import colors from "tailwindcss/colors";
import animatePlugin from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // shadcn CSS variable mappings
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand palette — Stanford Cardinal Red (Linear redesign)
        brand: {
          50: "#fdf2f2",
          100: "#fae0e0",
          200: "#f4bfbf",
          500: "#b81e1e",
          600: "#8c1515",
          700: "#820000",
          800: "#6e0f0f",
          900: "#4f0a0a",
        },
        "surface-0": "var(--surface-0)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        "text-1": "var(--text-1)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        "text-4": "var(--text-4)",
        "border-1": "var(--border-1)",
        "border-2": "var(--border-2)",
        "border-3": "var(--border-3)",
        // Neutral gray palette — cool-shifted for modern SaaS aesthetic
        gray: {
          50: "#fafafa",
          100: "#f5f5f4",
          200: "#e7e5e4",
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
        "surface-secondary": "#fafafa",
        "surface-tertiary": "#e7e5e4",
        // Semantic tokens — borders
        "border-default": "rgba(0,0,0,0.08)",
        "border-strong": "rgba(0,0,0,0.16)",
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
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Poppins", "Arial", "sans-serif"],
      },
      fontSize: {
        xs: ["0.875rem", { lineHeight: "1.25rem" }],
        sm: ["1rem", { lineHeight: "1.5rem" }],
        base: ["1.125rem", { lineHeight: "1.625rem" }],
        lg: ["1.25rem", { lineHeight: "1.875rem" }],
        xl: ["1.375rem", { lineHeight: "2rem" }],
        "2xl": ["1.75rem", { lineHeight: "2.25rem" }],
        "3xl": ["2.125rem", { lineHeight: "2.5rem" }],
        "4xl": ["2.5rem", { lineHeight: "2.75rem" }],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        modal: "0 20px 60px rgba(0,0,0,0.12)",
      },
      keyframes: {
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
        "slide-in-right": "slideInRight 0.25s ease-out",
        "fade-in-up": "fadeInUp 0.4s ease-out forwards",
        "mission-complete": "missionComplete 280ms ease-out forwards",
        "pulse-soft": "pulseSoft 1.4s ease-in-out infinite",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "0.75rem",
        button: "0.5rem",
        badge: "9999px",
        input: "0.5rem",
      },
    },
  },
  plugins: [animatePlugin],
};
