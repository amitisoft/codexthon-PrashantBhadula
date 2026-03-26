import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/app/router/AppRouter";
import { ThemeRoot } from "@/components/ui/ThemeRoot";
import { applyTheme, type ThemeMode } from "@/store/themeStore";
import "@/styles/globals.css";

const queryClient = new QueryClient();
const storedTheme = localStorage.getItem("pft-theme");

if (storedTheme) {
  try {
    const parsed = JSON.parse(storedTheme) as { state?: { mode?: ThemeMode } };
    applyTheme(parsed.state?.mode === "dark" ? "dark" : "light");
  } catch {
    applyTheme("light");
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeRoot>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </ThemeRoot>
    </QueryClientProvider>
  </React.StrictMode>,
);
