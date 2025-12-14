import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { ThemeProvider, ThemeScript } from "./context/ThemeContext";

export const metadata: Metadata = {
    title: "Events Dashboard",
    description: "Events Dashboard Application",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* Theme script to prevent flash */}
                <ThemeScript />
                {/* Meta theme color for mobile browsers */}
                <meta name="theme-color" content="#ffffff" />
                <meta name="color-scheme" content="light dark" />
            </head>
            <body className="transition-colors duration-300">
                <ThemeProvider defaultTheme="system">
                    <Providers>{children}</Providers>
                </ThemeProvider>
            </body>
        </html>
    );
}
