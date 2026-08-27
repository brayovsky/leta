import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://leta.now"),
  title: "Leta — Shopping made easy",
  description:
    "Tell Leta what you need from the shops. We shop it and deliver it to you. Currently piloting in Sabaki.",
  openGraph: {
    title: "Leta — Shopping made easy",
    description:
      "Your local shopping assistant. WhatsApp your request and we'll get it delivered.",
    url: "https://leta.now",
    siteName: "Leta",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}