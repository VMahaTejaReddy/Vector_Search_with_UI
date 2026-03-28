/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#050816",
        ink: "#0a1020",
        panel: "rgba(15, 23, 42, 0.72)",
        accent: "#6366F1",
        electric: "#3B82F6"
      },
      fontFamily: {
        sans: ["Inter", "Geist", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glass: "0 24px 80px rgba(2, 6, 23, 0.45)",
        glow: "0 0 0 1px rgba(99, 102, 241, 0.18), 0 18px 64px rgba(59, 130, 246, 0.26)"
      }
    }
  },
  plugins: []
};
