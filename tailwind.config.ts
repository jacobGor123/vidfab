import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-open-sans)", "sans-serif"],
        heading: ["var(--font-open-sans)", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))", // Maintained from shadcn
        input: "hsl(var(--input))", // Maintained
        ring: "hsl(var(--ring))", // Maintained
        background: "hsl(var(--background))", // Maintained
        foreground: "hsl(var(--foreground))", // Maintained
        primary: {
          DEFAULT: "hsl(var(--primary))", // e.g., a refined purple
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))", // e.g., a subtle cyan
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))", // e.g., a vibrant pink, used sparingly
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          // Maintained
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          // Maintained
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          // Maintained
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          // Maintained
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Refined Brand Colors (example adjustments)
        // Keeping the spirit, but allowing for more sophisticated usage
        brand: {
          pink: {
            light: "#FF69B4", // Lighter Pink
            DEFAULT: "#F43F8A", // Original: #ff0080
            dark: "#D12A6B",
          },
          purple: {
            light: "#A47DFF",
            DEFAULT: "#8A2BE2", // Original: #8000ff (Blue Violet - more accessible)
            dark: "#6A1DAD",
          },
          cyan: {
            light: "#79F2F2",
            DEFAULT: "#00E5E5", // Original: #00ffff (Brighter, more distinct)
            dark: "#00C0C0",
          },
          // Adding sophisticated dark grays for depth
          gray: {
            900: "#121217", // Near black for deep backgrounds
            800: "#1A1A22", // Darker gray
            700: "#2C2C3A", // Medium dark gray
          },
        },
      },
      borderRadius: {
        // Maintained
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        // Maintained
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      // Apple-esque transition timing
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
      boxShadow: {
        "apple-soft": "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.08)",
        "apple-medium": "0 4px 12px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)",
        "apple-strong": "0 10px 30px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.07)",
      },
      animation: {
        shine: "shine 2.5s ease-in-out infinite",
        gradient: "gradient 3s ease infinite",
      },
      keyframes: {
        shine: {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
