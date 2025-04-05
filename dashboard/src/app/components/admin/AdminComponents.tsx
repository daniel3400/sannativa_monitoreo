"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UserManagement from '@/app/components/admin/UserManagement';
import UserRegistration from '@/app/components/admin/UserRegistration';
import UserForm from '@/app/components/admin/UserForm';
import DatabaseManagement from '@/app/components/admin/DatabaseManagement';
import NotificationsControl from '@/app/components/admin/NotificationsControl';
import MonitoringDashboard from '@/app/components/shared/MonitoringDashboard'; // Importamos el componente compartido
import { supabase } from '@/app/utils/supabaseClient';

export default function AdminComponents() {
  const [activeComponent, setActiveComponent] = useState<string>('userManagement');
  const router = useRouter();

  // Función para cerrar sesión
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Redirigir al componente Auth (página de login)
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Rendering simplificado
  const renderComponent = () => {
    switch (activeComponent) {
      case 'userManagement': 
        return <UserManagement />;
      case 'userRegistration': 
        return <UserRegistration />;
      case 'databaseManagement': 
        return <DatabaseManagement />;
      case 'notificationsControl':
        return <NotificationsControl />;
      case 'monitoring':
        return <MonitoringDashboard />;
      default: 
        return <UserManagement />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto justify-between">
          <div className="flex">
            <button 
              onClick={() => setActiveComponent('userManagement')}
              className={`py-4 px-6 font-medium text-sm flex items-center ${
                activeComponent === 'userManagement' 
                  ? 'border-b-2 border-green-500 text-green-600' 
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Gestión de Usuarios
            </button>
            
            <button 
              onClick={() => setActiveComponent('userRegistration')}
              className={`py-4 px-6 font-medium text-sm flex items-center ${
                activeComponent === 'userRegistration' 
                  ? 'border-b-2 border-green-500 text-green-600' 
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Registrar Usuario
            </button>
            
            <button 
              onClick={() => setActiveComponent('monitoring')}
              className={`py-4 px-6 font-medium text-sm flex items-center ${
                activeComponent === 'monitoring' 
                  ? 'border-b-2 border-green-500 text-green-600' 
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Monitoreo
            </button>
            
            <button 
              onClick={() => setActiveComponent('databaseManagement')}
              className={`py-4 px-6 font-medium text-sm flex items-center ${
                activeComponent === 'databaseManagement' 
                  ? 'border-b-2 border-green-500 text-green-600' 
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Gestión BD
            </button>
            
            <button 
              onClick={() => setActiveComponent('notificationsControl')}
              className={`py-4 px-6 font-medium text-sm flex items-center ${
                activeComponent === 'notificationsControl' 
                  ? 'border-b-2 border-green-500 text-green-600' 
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notificaciones
            </button>
          </div>
          
          {/* Botón de cierre de sesión */}
          <button 
            onClick={handleSignOut}
            className="py-4 px-6 font-medium text-sm flex items-center text-red-500 hover:text-red-700 border-b-2 border-transparent hover:border-red-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </nav>
      </div>

      <div className="p-6">
        {renderComponent()}
      </div>
    </div>
  );
}