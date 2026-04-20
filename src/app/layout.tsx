import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Nunito } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TREND",
  description: "Trivia bíblica para jóvenes de la iglesia",
  manifest: "/manifest.json",
  applicationName: "#TREND",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "#TREND",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#08051a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${bebas.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#08051a] text-white font-nunito">
        <ServiceWorkerRegister />
        <main className="flex-1 relative z-10">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
