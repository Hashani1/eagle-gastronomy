import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        eagle: {
          orange: '#f97316', // Portokalli kryesor
          dark: '#0f172a',   // Blu e errët / Sidebar
          light: '#f8fafc',  // Sfond i lehtë
          green: '#10b981',  // Gjelbër për sukses
          blue: '#3b82f6',   // Blu për informacion
        },
      },
    },
  },
  plugins: [],
};
export default config;