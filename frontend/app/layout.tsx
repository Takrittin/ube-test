import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "UBE Inspection Station",
  description:
    "A mobile-first demonstration of AI-assisted product inspection and traceability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
