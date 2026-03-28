import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/layout/app-header";
import { Toaster } from "@/components/ui/sonner";
import { FeedbackButton } from "@/components/shared/feedback-button";

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
      <body className={`${geistSans.variable} font-sans antialiased bg-background text-foreground min-h-screen`}>
        <AppHeader />
        <main className="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-6">
          {children}
        </main>
        <Toaster />
        <FeedbackButton />
      </body>
    </html>
  );
}
