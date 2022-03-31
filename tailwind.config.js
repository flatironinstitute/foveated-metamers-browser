const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      sans: ["Inter var", ...defaultTheme.fontFamily.sans],
      colors: {
        teal: "#007f9d",
        silver: "#7F7F7F",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
};
