import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AIRIS: AI-Assisted Resume Analysis & Interview Simulation Platform",
  description:
    "An AI-assisted employability preparation platform for graduating students and job seekers, developed at the Technological Institute of the Philippines - Manila.",
  keywords: [
    "AIRIS",
    "Resume Analysis",
    "Interview Simulation",
    "Employability Platform",
    "Graduating Students",
    "TIP Manila",
  ],
  authors: [{ name: "AIRIS Project Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
