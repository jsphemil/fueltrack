import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ServiceWorker from "@/components/ServiceWorker";
import { THEME_STORAGE_KEY } from "@/lib/ui";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "The fuel gauge your bike doesn't have. Know how far you can ride before reserve, track real mileage and costs, and get reminders for service and documents.";

export const metadata: Metadata = {
  metadataBase: new URL("https://fueltrack-five.vercel.app"),
  title: "FuelTrack",
  description: DESCRIPTION,
  appleWebApp: { capable: true, title: "FuelTrack", statusBarStyle: "default" },
  // Link previews (WhatsApp, Telegram and so on).
  openGraph: {
    title: "FuelTrack: the fuel gauge your bike doesn't have",
    description: DESCRIPTION,
    url: "/",
    siteName: "FuelTrack",
    type: "website",
    images: [{ url: "/icon/512", width: 512, height: 512, alt: "FuelTrack" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1113" },
  ],
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
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved theme before first paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen">
        {/*
          // IMPORTANT:
          // Layout structure must remain constant to prevent UI blocking issues.
        */}
        <AppShell>{children}</AppShell>
        <ServiceWorker />
      </body>
    </html>
  );
}
