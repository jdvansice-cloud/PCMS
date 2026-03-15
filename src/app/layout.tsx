import type { ReactNode } from "react";

// Root layout is a pass-through — locale layout handles html/body/i18n
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
