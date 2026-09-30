import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b2239",
        muted: "#64748b",
        paper: "#f3f7fa",
        ube: {
          50: "#eef8ff",
          100: "#d8efff",
          200: "#b9e2ff",
          300: "#86ceff",
          400: "#4cb1f2",
          500: "#188ad2",
          600: "#0873ba",
          700: "#005d9f",
          800: "#004a80",
          900: "#003963"
        }
      },
      boxShadow: {
        panel: "0 20px 50px -32px rgba(55, 38, 81, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
