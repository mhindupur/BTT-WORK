/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        btt: { navy: "#0f2744", accent: "#1e5a8e" },
      },
    },
  },
  plugins: [],
};
