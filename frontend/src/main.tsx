import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material";
import theme from "./theme";
import "./index.css";
import Router from "./pages/Router";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SchoolYearProvider } from "./context/SchoolYearContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";

axios.defaults.withCredentials = true;

// Add a response interceptor
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // If 401 Unauthorized, redirect to login
      if (
        window.location.pathname !== "/" &&
        !(window as any).__isLoggingOut &&
        !(window as any).__isRedirectingToLogin
      ) {
        (window as any).__isRedirectingToLogin = true;
        window.location.replace("/");
      }
    }
    return Promise.reject(error);
  }
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SchoolYearProvider>
            <ThemeProvider theme={theme}>
              <Router />
            </ThemeProvider>
          </SchoolYearProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
