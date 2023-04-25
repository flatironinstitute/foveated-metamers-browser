// @ts-check
const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      sans: ["Inter var", ...defaultTheme.fontFamily.sans],
      colors: {
        teal: "#007f9d",
        silver: "#7F7F7F",
        gamma: {
          50: "#f2f2f2",
          100: "#e5e5e5",
          200: "#cccccc",
          300: "#b2b2b2",
          400: "#999999",
          500: "#7F7F7F",
          600: "#4c4c4c",
          700: "#333333",
          800: "#191919",
          900: "#43302b",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
}
