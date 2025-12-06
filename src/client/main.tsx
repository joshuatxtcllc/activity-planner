import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

// Add diagnostic logging
console.log("🚀 main.tsx executing");
console.log("Environment:", import.meta.env.MODE);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

try {
  const rootElement = document.getElementById("root");
  console.log("Root element:", rootElement);

  if (!rootElement) {
    throw new Error("Root element not found!");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );

  console.log("✅ React app mounted successfully");
} catch (error) {
  console.error("❌ Error mounting React app:", error);
  // Display error on page
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: system-ui;">
      <h1 style="color: red;">Error Loading Application</h1>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${error}</pre>
    </div>
  `;
}
