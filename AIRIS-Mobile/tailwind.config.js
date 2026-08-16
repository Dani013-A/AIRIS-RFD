/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./constants/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        airisPrimary: "#F4A47A",
        airisSecondary: "#BFD6EA",
        airisAccent: "#79D5C8",
        airisText: "#1F2937",
        airisMuted: "#6B7280",
      },
    },
  },
  plugins: [],
};
