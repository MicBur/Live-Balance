import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Hey Mark!",
    description: "Der ultimative Alltags-Tipps-Analyzer",
    icons: {
        icon: '/favicon.png',
        apple: '/apple-touch-icon.png',
    },
};

import { UploadProvider } from "../contexts/UploadContext";
import UploadWidget from "../components/UploadWidget";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="de">
            <body className={inter.className}>
                <UploadProvider>
                    {children}
                    <UploadWidget />
                </UploadProvider>
            </body>
        </html>
    );
}
