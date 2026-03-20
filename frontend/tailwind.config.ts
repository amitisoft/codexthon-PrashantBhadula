import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F4F7F5",
        ink: "#1F3136",
        primary: {
          DEFAULT: "#244B66",
          soft: "#3F6D8C",
        },
        accent: {
          DEFAULT: "#4C8A87",
          soft: "#A9CBC8",
        },
        success: "#4C8B68",
        warning: "#CC9C4B",
        danger: "#C4665E",
        border: "#D7E1DE",
      },
      boxShadow: {
        panel: "0 18px 50px -28px rgba(27, 54, 70, 0.35)",
      },
      borderRadius: {
        xl2: "1.5rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
