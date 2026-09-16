import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter is the font used throughout the Figma mockups (see AI-WORKLOG.md) —
// wired to --font-sans, which globals.css's `font-sans` utility expects.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Product Content Studio",
  description: "Catalog of published products",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
