import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { ThemeProvider } from "../components/provider";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
export const metadata: Metadata = {
  title: "ClearSpendly - AI-Powered Receipt Management",
  description:
    "Transform receipts into actionable insights. Privacy-first expense management with AI-powered categorization, price anomaly detection, and smart analytics for modern businesses.",
  openGraph: {
    title: "ClearSpendly - AI-Powered Receipt Management",
    description:
      "Transform receipts into actionable insights. Privacy-first expense management with AI-powered categorization and smart analytics.",
    url: "https://clearspendly.com",
    siteName: "ClearSpendly",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ClearSpendly - AI-Powered Receipt Management",
      },
    ],
    locale: "en-US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-[-apple-system,BlinkMacSystemFont]antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
