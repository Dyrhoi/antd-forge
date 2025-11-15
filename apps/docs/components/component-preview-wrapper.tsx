"use client";

import "@ant-design/v5-patch-for-react-19";
import { App, ConfigProvider, theme as antdTheme } from "antd";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
    <App>
      <ConfigProvider
        theme={{
          algorithm: [...(theme === "dark" ? [antdTheme.darkAlgorithm] : [])],
        }}
      >
        {children}
      </ConfigProvider>
    </App>
  );
}
