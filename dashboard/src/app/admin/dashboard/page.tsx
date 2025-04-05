"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/utils/supabaseClient';
import AdminComponents from '@/app/components/admin/AdminComponents';

export default function AdminDashboard() {
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        // Verificar si es administrador
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error || !profile) {
          console.error('Error obteniendo perfil:', error);
          setUserName(session.user.email || 'Admin');
        } else {
          setUserName(profile.full_name || session.user.email || 'Admin');
        }
      } catch (error) {
        console.error('Error verificando sesión:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-green-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          <p className="mt-4 text-white font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-green-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">Panel Administrativo</h1>
            <span className="ml-2 bg-green-700 px-2 py-1 rounded text-xs">SANNATIVA</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{userName}</span>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-md text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Componentes de Administración</h2>
            <AdminComponents />
          </div>
        </div>
      </div>
    </div>
  );
}