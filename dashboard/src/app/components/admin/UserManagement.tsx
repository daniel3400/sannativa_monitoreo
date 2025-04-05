"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/app/utils/supabaseClient';
import { sendTelegramNotification } from '@/lib/telegramService';

// Definir la interfaz fuera del componente para mejor mantenimiento
interface User {
  id: string;
  email: string;
  role: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  // Función para enviar notificaciones de forma segura
  const safeNotify = async (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    try {
      await sendTelegramNotification(message, { type });
    } catch (notifyError) {
      console.error('Error al enviar notificación:', notifyError);
    }
  };

  // Función para cargar usuarios con verificación detallada
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);
      
      console.log('Cargando usuarios desde Supabase...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email');

      if (error) {
        console.error('Error al cargar usuarios:', error);
        setError('Error al cargar usuarios: ' + error.message);
        throw error;
      }
      
      console.log(`Usuarios cargados: ${data?.length || 0}`);
      if (data) {
        console.log('Lista de IDs de usuarios:', data.map(u => u.id));
      }
      
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error en loadUsers:', error);
      setError('Error al cargar usuarios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reemplaza la función handleDeleteUser con esta versión que usa el API Route

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Está seguro que desea eliminar al usuario ${userEmail}?`)) return;
  
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setDebugInfo(null);
      
      console.log('Solicitando eliminación de usuario vía API:', userId);
      
      // Usar el API Route para eliminar con privilegios administrativos
      const response = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userEmail }),
      });
      
      const result = await response.json();
      console.log('Respuesta de API:', result);
      
      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Error desconocido al eliminar usuario';
        console.error('Error en la respuesta del API:', errorMessage);
        setError(`Error al eliminar usuario: ${errorMessage}`);
        return;
      }
      
      // Operación exitosa
      setSuccess(result.message || `Usuario ${userEmail} eliminado correctamente`);
      
      // Recargar la lista de usuarios
      loadUsers();
      
      // Intentar enviar notificación pero no fallar si hay problemas
      try {
        await safeNotify(
          `Usuario eliminado:\n\nEmail: ${userEmail}\nID: ${userId}`,
          'warning'
        );
      } catch (notifyError) {
        console.warn('Error al enviar notificación:', notifyError);
      }
    } catch (error: any) {
      console.error('Error en handleDeleteUser:', error);
      setError(`Error durante la eliminación: ${error.message}`);
      setDebugInfo(error.stack || 'No hay stack trace disponible');
    } finally {
      setLoading(false);
    }
  };

  // Añade esta función al componente UserManagement

  const handleRoleChange = async (userId: string, userEmail: string, newRole: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setDebugInfo(null);
      
      console.log(`Actualizando rol de usuario ${userEmail} a ${newRole}`);
      
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) {
        console.error('Error al actualizar rol:', error);
        setError(`Error al actualizar rol: ${error.message}`);
        return;
      }
      
      setSuccess(`Rol de ${userEmail} actualizado a ${newRole}`);
      
      // Recargar usuarios para reflejar los cambios
      await loadUsers();
      
      // Enviar notificación
      try {
        await safeNotify(
          `Rol de usuario actualizado:\n\nEmail: ${userEmail}\nNuevo rol: ${newRole}`,
          'info'
        );
      } catch (notifyError) {
        console.warn('Error al enviar notificación:', notifyError);
      }
    } catch (error: any) {
      console.error('Error en handleRoleChange:', error);
      setError(`Error al cambiar rol: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-green-50 shadow-md rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-green-900">Gestión de Usuarios</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
          
          {debugInfo && (
            <div className="mt-2 p-2 bg-red-50 text-xs font-mono overflow-auto">
              <details>
                <summary className="cursor-pointer font-bold">Información de depuración</summary>
                <pre className="whitespace-pre-wrap">{debugInfo}</pre>
              </details>
            </div>
          )}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
          <p>{success}</p>
        </div>
      )}
      
      <div className="mb-4">
        <button 
          onClick={() => loadUsers()} 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Actualizar lista
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-4">
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-green-200">
            <thead className="bg-green-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-900 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-900 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-900 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-green-900 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-green-50 divide-y divide-green-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-green-100">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {user.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-900">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, user.email, e.target.value)}
                      className="bg-green-50 border border-green-300 text-green-900 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="usuario">Usuario</option>
                      <option value="administrador">Administrador</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded transition duration-200"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 italic">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserManagement;