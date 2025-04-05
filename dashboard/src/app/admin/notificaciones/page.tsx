"use client";

import Link from 'next/link';
import NotificationsControl from '@/app/components/admin/NotificationsControl';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-green-950">
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Link 
            href="/dashboard/admin" 
            className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Dashboard Admin
          </Link>
          <h1 className="text-3xl font-bold text-white ml-4">
            Configuración de Alertas
          </h1>
        </div>
        
        <NotificationsControl />
      </div>
    </div>
  );
}