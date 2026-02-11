import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "K&D ✦ Public Dumping Journal",
  description: "where K & D dump their thoughts into the void",
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
