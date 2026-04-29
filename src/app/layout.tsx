import type { Metadata } from "next";
import { Heebo, Rubik } from "next/font/google";
import "./globals.css";
import NightSkyBackground from "@/components/ui/NightSkyBackground";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Spizzzy — ספרי ילדים מותאמים אישית",
  description:
    "צרו ספרי ילדים קסומים ומותאמים אישית עם איורים, קריינות ומוזיקה מבוססי AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${rubik.variable} h-full antialiased`}>
      <body className="min-h-full">
        <NightSkyBackground />
        {children}
      </body>
    </html>
  );
}
