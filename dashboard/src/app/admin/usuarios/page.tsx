'use client';
import { useState } from 'react';
import UserForm from '../../components/admin/UserForm';
import { sendTelegramNotification } from '../../../lib/telegramService';

interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'usuario';
  telefono: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);

  const handleAddUser = async (userData: Omit<User, 'id'>) => {
    const newUser = {
      ...userData,
      id: Date.now().toString(),
    };
    setUsers([...users, newUser]);
    setShowForm(false);
    
    // Enviar notificación al añadir usuario
    await sendTelegramNotification(
      `Nuevo usuario registrado:\n\nNombre: ${userData.nombre}\nEmail: ${userData.email}\nRol: ${userData.rol}\nTeléfono: ${userData.telefono}`,
      { type: 'success' }
    );
  };

  const handleDeleteUser = async (id: string) => {
    // Encontrar el usuario antes de eliminarlo
    const userToDelete = users.find(user => user.id === id);
    
    // Eliminar el usuario
    setUsers(users.filter(user => user.id !== id));
    
    // Enviar notificación al eliminar usuario
    if (userToDelete) {
      await sendTelegramNotification(
        `Usuario eliminado:\n\nNombre: ${userToDelete.nombre}\nEmail: ${userToDelete.email}\nRol: ${userToDelete.rol}`,
        { type: 'warning' }
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Agregar Usuario
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Agregar Usuario</h2>
            <UserForm
              onSubmit={handleAddUser}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">{user.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.telefono}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{user.rol}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}