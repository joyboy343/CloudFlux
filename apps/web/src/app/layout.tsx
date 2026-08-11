import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "CloudFlux",
  description: "Observe-only AWS cloud intelligence for small engineering teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
