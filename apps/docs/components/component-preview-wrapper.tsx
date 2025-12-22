"use client";

import { App, ConfigProvider, theme as antdTheme } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { AntdForgeProvider } from "antd-forge";

const queryClient = new QueryClient();

export function ComponentPreviewWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <App>
        <AntdForgeProvider queryClient={queryClient}>
          <ConfigProvider
            theme={{
              algorithm: [
                ...(theme === "dark" ? [antdTheme.darkAlgorithm] : []),
              ],
            }}
          >
            {children}
          </ConfigProvider>
        </AntdForgeProvider>
      </App>
    </QueryClientProvider>
  );
}
