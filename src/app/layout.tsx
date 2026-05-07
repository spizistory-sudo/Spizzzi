import type { Metadata } from "next";
import { Figtree, Lora } from "next/font/google";
import "./globals.css";
import NightSkyBackground from "@/components/ui/NightSkyBackground";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "StoryMagic — Personalized Children's Books",
  description:
    "Create magical, personalized, illustrated storybooks for your child with AI-generated stories, illustrations, and narration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${lora.variable} h-full antialiased`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">
        <NightSkyBackground />
        {children}
      </body>
    </html>
  );
}
