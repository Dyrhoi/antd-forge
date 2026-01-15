// src/provider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";

interface AntdForgeContextValue {
  queryClient: QueryClient;
  isUsingExternalQueryClient: boolean;
}

const AntdForgeContext = createContext<AntdForgeContextValue | null>(null);

// Internal default client (lazy-created)
let internalQueryClient: QueryClient | null = null;
function getInternalQueryClient() {
  if (!internalQueryClient) {
    internalQueryClient = new QueryClient();
  }
  return internalQueryClient;
}

interface AntdForgeProviderProps {
  children: React.ReactNode;
  queryClient?: QueryClient; // Optional - user's client
}

export function AntdForgeProvider({
  children,
  queryClient,
}: AntdForgeProviderProps) {
  const value = useMemo<AntdForgeContextValue>(
    () => ({
      queryClient: queryClient ?? getInternalQueryClient(),
      isUsingExternalQueryClient: !!queryClient,
    }),
    [queryClient],
  );

  return (
    <AntdForgeContext.Provider value={value}>
      {/* Only wrap with QCP if using internal client */}
      {value.isUsingExternalQueryClient ? (
        children
      ) : (
        <QueryClientProvider client={value.queryClient}>
          {children}
        </QueryClientProvider>
      )}
    </AntdForgeContext.Provider>
  );
}

export function useAntdForge() {
  const ctx = useContext(AntdForgeContext);
  if (!ctx) {
    return {
      queryClient: getInternalQueryClient(),
      isUsingExternalQueryClient: false,
    };
  }
  return ctx;
}
