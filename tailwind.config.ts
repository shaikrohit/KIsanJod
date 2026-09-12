import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#1B5E20", // Authoritative Agri Green Primary (#1B5E20)
          950: "#0b3813", // Deep Mandi Forest Green
        },
        earth: {
          50:  "#FDFBF7", // Soft warm off-white card background (#FDFBF7)
          100: "#f7f3e8",
          200: "#eee3cb",
          300: "#e0cca4",
          400: "#d0b077",
          500: "#b9914b",
          600: "#9e743a",
          700: "#7c5630",
          800: "#67462b",
          900: "#553a27",
        },
        amber: {
          warm: "#D97706",    // Harvest Amber Primary (#D97706)
          harvest: "#B45309", // Deep Harvest Amber
          light: "#FEF3C7",
        },
        mandi: {
          waiting: "#4B5563",   // Neutral Gray for waiting queue
          bay: "#0284c7",       // Blue for active bay processing
          called: "#7C3AED",    // Vivid Purple for called to bay
          standby: "#D97706",   // Amber for standby / grace timer
          ready: "#16A34A",     // Green for ready / checked-in
          completed: "#059669", // Dark Emerald for completed & billed
          credited: "#047857",  // PFMS DBT credited
        }
      },
      minHeight: {
        touch: "52px", // Rural accessibility touch target boundary (>=50px)
      },
      minWidth: {
        touch: "52px",
      },
      boxShadow: {
        'farmer-card': '0 4px 20px -2px rgba(27, 94, 32, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'touch-btn': '0 4px 0 0 #0b3813',
        'touch-btn-amber': '0 4px 0 0 #78350f',
      },
      fontSize: {
        'rural-lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'rural-xl': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '700' }],
        'token-display': ['2.5rem', { lineHeight: '2.5rem', fontWeight: '800' }],
      }
    },
  },
  plugins: [],
};

export default config;

