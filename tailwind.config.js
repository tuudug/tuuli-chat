const typography = require("@tailwindcss/typography");

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Backgrounds (Kept mostly the same dark structure) ---
        "bg-primary": "#201F23", // Main background (Very dark grey)
        "bg-sidebar": "#2B2A33", // Sidebar background (Slightly lighter grey)
        "bg-input": "#35343C", // Input area background (Mid-dark grey)

        // --- Blue Accents (Replaced pink/purple) ---
        "btn-primary": "#4477CE", // New Chat button background (Medium Blue)
        "btn-primary-hover": "#5A8EDD", // Lighter shade for hover (adjust as needed)

        // --- Text Colors (Kept for contrast) ---
        "text-primary": "#F0F0F0", // Primary text (Slightly off-white)
        "text-secondary": "#A0A0A0", // Muted text (Mid-grey)
        "text-accent": "#4477CE", // Sidebar headers, button text (Matches btn-primary Blue)

        // --- Borders (Kept consistent with input bg) ---
        "border-primary": "#35343C", // Borders (Mid-dark grey)
      },
    },
  },
  plugins: [typography],
};

module.exports = config;
