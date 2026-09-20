import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mayank Planner",
  description: "A personal monthly and weekly planning space.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/planner-icon.svg" }
};

export const viewport: Viewport = { themeColor: "#0a0d18" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
