import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Personal Pronote",
  description: "Dashboard personnel pour Pronote",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Ignore MetaMask extension errors (inpage.js) that can break the Next.js overlay */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.filename && e.filename.indexOf('chrome-extension') !== -1) {
                  e.preventDefault();
                  e.stopPropagation();
                  return true;
                }
              }, true);
              window.addEventListener('unhandledrejection', function(e) {
                var msg = (e.reason && (e.reason.message || String(e.reason))) || '';
                if (msg.indexOf('MetaMask') !== -1 || msg.indexOf('Failed to connect') !== -1) {
                  e.preventDefault();
                }
              });
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
