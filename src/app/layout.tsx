import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import GlobalHeader from "@/components/GlobalHeader";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "KisanJod - Mandi Slot Booking & Procurement PWA",
  description: "Digital Agricultural Procurement Platform for Department of Consumer Affairs (DoCA)",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#072a1e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased selection:bg-emerald-200">
        <LanguageProvider>
          <ServiceWorkerRegister />
          <div className="flex flex-col min-h-screen">
            <GlobalHeader />
            <main className="flex-1 mx-auto max-w-5xl w-full px-3 py-5 sm:px-6">
              {children}
            </main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
