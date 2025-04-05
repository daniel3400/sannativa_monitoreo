"use client";

import { useEffect } from 'react';
import { initializeAppServices } from '@/app/services/appInitService';

interface AppInitializerProps {
  children: React.ReactNode;
}

export default function AppInitializer({ children }: AppInitializerProps) {
  useEffect(() => {
    // Inicializar servicios al cargar la aplicación
    initializeAppServices();
  }, []);

  return <>{children}</>;
}