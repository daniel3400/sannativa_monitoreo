"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/utils/supabaseClient';

export default function DashboardRedirect() {
  const router = useRouter();
  const [message, setMessage] = useState('Redirigiendo...');

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
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error('Error obteniendo perfil:', error);
          setMessage('Error verificando roles. Redirigiendo a página principal...');
          setTimeout(() => router.push('/'), 2000);
          return;
        }
        
        if (profile && profile.role === 'admin') {
          setMessage('Redirigiendo al panel de administración...');
          // Intentar ambas rutas
          try {
            router.push('/admin/dashboard');
          } catch (e) {
            router.push('/dashboard/admin');
          }
        } else {
          setMessage('Redirigiendo al panel de usuario...');
          router.push('/dashboard/user');
        }
      } catch (error) {
        console.error('Error en redirección:', error);
        setMessage('Error en la redirección. Volviendo a página principal...');
        setTimeout(() => router.push('/'), 2000);
      }
    };
    
    checkSession();
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-green-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        <p className="mt-4 text-white font-medium">{message}</p>
      </div>
    </div>
  );
}