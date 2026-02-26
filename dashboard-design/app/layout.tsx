import { Toaster } from "@/components/ui/sonner"
import React from "react"
import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { authClient } from "@/lib/auth/client";
import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { AuthProvider } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/auth/auth-guard";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Vetor Imobi - Central do Gestor",
  description:
    "Plataforma de gestão imobiliária inteligente com IA para otimização de vendas",
  generator: "v0.app",
  icons: {
    icon: "/V_de_Vetor-removebg-preview.png",
    apple: "/V_de_Vetor-removebg-preview.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#52a6ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <NeonAuthUIProvider
          authClient={authClient}
          redirectTo="/"
          credentials={{ forgotPassword: true }}
        >
          <AuthProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
            <Toaster />
          </AuthProvider>
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
