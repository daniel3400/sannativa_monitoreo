import { useState } from 'react';

interface UserFormProps {
  onSubmit: (userData: UserFormData) => void;
  onCancel: () => void;
}

export interface UserFormData {
  nombre: string;
  email: string;
  rol: 'admin' | 'usuario';
  telefono: string;
}

export default function UserForm({ onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    nombre: '',
    email: '',
    rol: 'usuario',
    telefono: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
          Nombre completo
        </label>
        <input
          type="text"
          id="nombre"
          name="nombre"
          required
          value={formData.nombre}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                   focus:border-green-500 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Correo electrónico
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                   focus:border-green-500 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
          Teléfono
        </label>
        <input
          type="tel"
          id="telefono"
          name="telefono"
          required
          value={formData.telefono}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                   focus:border-green-500 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="rol" className="block text-sm font-medium text-gray-700">
          Rol
        </label>
        <select
          id="rol"
          name="rol"
          value={formData.rol}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                   focus:border-green-500 focus:ring-green-500"
        >
          <option value="usuario">Usuario</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white 
                   border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 
                   rounded-md hover:bg-green-700"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}