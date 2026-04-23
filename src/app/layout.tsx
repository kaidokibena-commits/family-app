import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Perekonna Tegevused",
  description: "Perekonna tegevuste ja teenimiste jälgija",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="et" className={`${geistSans.variable} h-full`}>
      <body className="h-full bg-[#0a0a0f] text-white antialiased">{children}</body>
    </html>
  );
}
