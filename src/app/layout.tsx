import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/components/AuthProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Friends",
  description:
    "Friends — private network for your close circle: friends, feed, chats and calls.",
  applicationName: "Friends",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Friends",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "color-scheme": "dark",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#c4784a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          <I18nProvider>
            <AppShell>{children}</AppShell>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
