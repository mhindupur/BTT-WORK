/** @type {import('tailwindcss').Config} */
/** NUCLICK logo color theme — blue #00529B / #00AEEF, green #28B446 */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        btt: {
          navy: "#0B4F8C",
          blue: "#00529B",
          accent: "#28B446",
          green: "#28B446",
          greenDark: "#1E8B38",
          blueDark: "#083A68",
          mist: "#E8F6EC",
          sky: "#E7F2FA",
        },
      },
      boxShadow: {
        brand: "0 12px 40px -18px rgba(0, 82, 155, 0.45)",
      },
      backgroundImage: {
        "btt-hero":
          "linear-gradient(135deg, #0B4F8C 0%, #00529B 42%, #28B446 100%)",
        "btt-soft":
          "radial-gradient(1200px 600px at 10% -10%, rgba(40,180,70,0.18), transparent 55%), radial-gradient(900px 500px at 100% 0%, rgba(0,174,239,0.18), transparent 50%), linear-gradient(180deg, #f4f8fb 0%, #eef5f1 100%)",
      },
    },
  },
  plugins: [],
};
