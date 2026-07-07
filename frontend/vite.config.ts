import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    watch: {
      usePolling: true,
    },
    host: true,
    port: 5173,
  },
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: [
      "@mui/material",
      "@mui/material/styles",
      "@mui/icons-material",
      "@mui/x-charts",
      "@mui/x-data-grid",
      "@mui/x-date-pickers",
      "@emotion/react",
      "@emotion/styled",
      "react",
      "react-dom",
      "react-router-dom",
      "axios",
      "lucide-react",
      "chart.js",
      "recharts",
      "xlsx",
      "jspdf",
      "jspdf-autotable",
      "date-fns"
    ],
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split Material UI - This is usually the largest chunk
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui';
            }
            // Split Charting and Calendars
            if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('recharts') || id.includes('@fullcalendar')) {
              return 'charts-calendar';
            }
            // Split File Processing (XLSX, PDF)
            if (id.includes('xlsx') || id.includes('jspdf') || id.includes('html2canvas')) {
              return 'file-utils';
            }
            // Split Password Strength (Heavy)
            if (id.includes('zxcvbn')) {
              return 'password-utils';
            }
            // Split General Utils
            if (id.includes('lucide-react') || id.includes('date-fns') || id.includes('axios')) {
              return 'utils';
            }
            // Note: We deliberately do NOT manually chunk 'react', 'react-dom', or 'react-router-dom' 
            // to avoid the "Cannot set properties of undefined (setting 'Children')" error 
            // which stems from improper splitting of React core modules.
          }
        },
      },
    },
  },
});
