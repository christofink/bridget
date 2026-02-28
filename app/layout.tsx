import type { Metadata, Viewport } from "next";
import SWUpdatePrompt from "@/components/shell/SWUpdatePrompt";
import SkipToContent from "@/components/shell/SkipToContent";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bridget",
  description: "Real-time subtitles for face-to-face conversations",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bridget",
  },
  icons: {
    apple: "/icons/icon-180x180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SkipToContent />
        {children}
        <SWUpdatePrompt />
      </body>
    </html>
  );
}
