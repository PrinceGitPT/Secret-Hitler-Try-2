import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secret Hitler MVP",
  description: "Tabletop-style Secret Hitler MVP with bots and Vercel-ready state handling"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
