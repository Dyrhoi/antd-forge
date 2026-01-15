export function warning(message: string): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[antd-typed] ${message}`);
  }
}
