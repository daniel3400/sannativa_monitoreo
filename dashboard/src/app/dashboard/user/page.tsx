"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/utils/supabaseClient';
import MonitoringDashboard from '@/app/components/shared/MonitoringDashboard';
import CiclosHistorial from '@/app/components/user/CiclosHistorial';
import CicloForm from '@/app/components/user/CicloForm';
import Navbar from '@/app/components/shared/Navbar';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('monitoreo');
  const [loading, setLoading] = useState(true);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const router = useRouter();

  const userTabs = [
    { id: 'monitoreo', label: 'Monitoreo' },
    { id: 'ciclos', label: 'Mis Ciclos' },
    { id: 'nuevo-ciclo', label: 'Nuevo Ciclo' }
  ];

  const loadCiclos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        router.push('/');
        return;
      }

      const { data, error } = await supabase
        .from('ciclos_cultivo')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;
      setCiclos(data || []);
    } catch (error) {
      console.error('Error cargando ciclos:', error);
    } finally {
      setLoading(false); // Añadimos esto para asegurar que loading se establezca en false
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/'); // Redirige al inicio/login
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      await loadCiclos();
    };

    checkSession();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="text-green-800 text-xl">Cargando...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={userTabs}
      />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'monitoreo' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-green-800 mb-6">
              Monitoreo de Sensores
            </h2>
            <MonitoringDashboard />
          </div>
        )}

        {activeTab === 'ciclos' && (
          <div>
            <h2 className="text-xl font-semibold text-green-800 mb-6">
              Mis Ciclos de Cultivo
            </h2>
            <CiclosHistorial 
              ciclos={ciclos}
              onCicloUpdated={loadCiclos}
            />
          </div>
        )}

        {activeTab === 'nuevo-ciclo' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-green-800 mb-6">
              Crear Nuevo Ciclo
            </h2>
            <CicloForm 
              onCicloCreated={async () => {
                await loadCiclos();
                setActiveTab('ciclos');
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default UserDashboard;