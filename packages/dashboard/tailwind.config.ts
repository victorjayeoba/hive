import type { Config } from "tailwindcss";

// Minimal config. The design reference lands later — extend theme/colors then.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
