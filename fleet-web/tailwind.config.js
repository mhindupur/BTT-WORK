/** @type {import('tailwindcss').Config} */
/** Brand palette from https://btttravels.com/ — green #2AA644, blue #1C75BC */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        btt: {
          navy: "#0B4F8C",
          blue: "#1C75BC",
          accent: "#2AA644",
          green: "#2AA644",
          greenDark: "#1E8B38",
          blueDark: "#083A68",
          mist: "#E8F6EC",
          sky: "#E7F2FA",
        },
      },
      boxShadow: {
        brand: "0 12px 40px -18px rgba(12, 79, 140, 0.45)",
      },
      backgroundImage: {
        "btt-hero":
          "linear-gradient(135deg, #0B4F8C 0%, #1C75BC 42%, #2AA644 100%)",
        "btt-soft":
          "radial-gradient(1200px 600px at 10% -10%, rgba(42,166,68,0.18), transparent 55%), radial-gradient(900px 500px at 100% 0%, rgba(28,117,188,0.22), transparent 50%), linear-gradient(180deg, #f4f8fb 0%, #eef5f1 100%)",
      },
    },
  },
  plugins: [],
};
