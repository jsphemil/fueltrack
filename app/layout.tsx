import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutNavigation from "@/components/LayoutNavigation";
import { THEME_STORAGE_KEY } from "@/lib/ui";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FuelTrack",
  description: "Track motorcycle fuel, mileage, range and spend.",
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
      <body className="min-h-screen flex flex-col">
        {/*
          // IMPORTANT:
          // Layout structure must remain constant to prevent UI blocking issues.
        */}
        <div className="flex-shrink-0">
          <LayoutNavigation />
        </div>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
