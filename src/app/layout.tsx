import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Shell } from "@/components/shell";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "بالغیب | سامانهٔ تعاملی ایمان به غیب",
    template: "%s · بالغیب",
  },
  description:
    "پیام‌رسانی با وجدان الهی، وضعیت، مخاطبین، سینمای آیات، مسابقهٔ ایمان به غیب و سفری سینمایی به معنای خلقت — قرآن سینماتیک",
  applicationName: "بالغیب",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    title: "بالغیب — الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ",
    description: "سامانهٔ تعاملی ایمان به غیب · قرآن سینماتیک",
    images: ["/images/hero.jpg"],
    locale: "fa_IR",
    type: "website",
  },
  appleWebApp: { capable: true, title: "بالغیب", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#03040b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-dvh bg-night-950 font-sans text-slate-200 antialiased">
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
