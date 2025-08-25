import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./hooks/use-auth.tsx";
import { TenantProvider } from "./hooks/use-tenant.tsx";
import { PermissionsProvider } from "./hooks/use-permissions.tsx";
import { ThemeProvider } from "./hooks/use-theme.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <PermissionsProvider>
              <App />
            </PermissionsProvider>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
