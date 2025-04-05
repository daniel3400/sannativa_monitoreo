"use client";

import { useEffect } from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/Providers";
import { initializeNotificationService } from './services/notificationService';
import AppInitializer from './layouts/AppInitializer';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Inicializar el servicio de notificaciones automáticamente
    const initServices = async () => {
      try {
        await initializeNotificationService();
        console.log('Servicio de notificaciones inicializado');
      } catch (error) {
        console.error('Error al inicializar servicios:', error);
      }
    };
    
    initServices();
  }, []);

  return (
    <html lang="es">
      <head>
        <title>Dashboard</title>
        <meta name="description" content="Sistema de monitoreo" />
      </head>
      <body className={`bg-gradient-to-br from-green-950 to-green-900 min-h-screen ${geistSans.variable} ${geistMono.variable}`}>
        <AppInitializer>
          {children}
        </AppInitializer>
      </body>
    </html>
  );
}
