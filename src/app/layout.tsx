import type { Metadata } from "next";
import "./globals.css";
import { inter } from "../lib/fonts";

export const metadata: Metadata = {
  title: "AI Invoice Generator",
  description: "Generate professional invoices with AI assistance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${inter.variable}`}>{children}</body>
    </html>
  );
}
