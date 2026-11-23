import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F8F9FC",
        surface: "#FFFFFF",
        line: "#E2E8F0",
        ink: "#0F172A",
        muted: "#475569",
        primary: { DEFAULT: "#0052FF", hover: "#003ECC" },
        danger: { DEFAULT: "#DC2626", soft: "#FEF2F2" },
        success: { DEFAULT: "#059669", soft: "#ECFDF5" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-jakarta)", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
