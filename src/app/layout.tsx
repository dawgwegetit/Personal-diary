import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D ✦ Public Dumping Journal",
  description: "where D dumps thoughts into the void",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
