import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/layout/app-header";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nepali Camping",
  description: "Group camping planner for the Nepali community in Seattle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className={`${geistSans.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        <AppHeader />
        <main className="mx-auto max-w-4xl px-4 py-6">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
