"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/app/utils/supabaseClient';

interface CicloFormProps {
  onCicloCreated: () => void;
}

const CicloForm = ({ onCicloCreated }: CicloFormProps) => {
  const [tipoPlanta, setTipoPlanta] = useState('');
  const [numeroPlants, setNumeroPlants] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cicloActivo, setCicloActivo] = useState(false);

  // Verificar si existe un ciclo activo al cargar el componente
  useEffect(() => {
    checkCicloActivo();
  }, []);

  const checkCicloActivo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('ciclos_cultivo')
        .select('*')
        .eq('owner_id', session.user.id)
        .is('fecha_fin', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setCicloActivo(!!data);
    } catch (error) {
      console.error('Error verificando ciclo activo:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cicloActivo) {
      setError('No puedes crear un nuevo ciclo mientras tengas uno activo');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const { error: insertError } = await supabase
        .from('ciclos_cultivo')
        .insert([
          {
            owner_id: session.user.id,
            tipo_planta: tipoPlanta,
            numero_plantas: parseInt(numeroPlants),
            fecha_inicio: new Date().toISOString(),
            etapa_actual: 'Germinación'
          }
        ]);

      if (insertError) throw insertError;

      setTipoPlanta('');
      setNumeroPlants('');
      onCicloCreated();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (cicloActivo) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            ⚠️
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Ya tienes un ciclo activo. Debes finalizar el ciclo actual antes de crear uno nuevo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <label className="block text-base font-semibold text-green-700">
          Número de Plantas
        </label>
        <input
          type="number"
          min="1"
          required
          className="mt-1 block w-full rounded-lg border-2 border-green-300 px-4 py-3 text-lg 
                   shadow-sm focus:border-green-500 focus:ring-green-500 bg-white text-gray-900"
          value={numeroPlants}
          onChange={(e) => setNumeroPlants(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <label className="block text-base font-semibold text-green-700">
          Tipo de Planta
        </label>
        <input
          type="text"
          required
          className="mt-1 block w-full rounded-lg border-2 border-green-300 px-4 py-3 text-lg
                   shadow-sm focus:border-green-500 focus:ring-green-500 bg-white text-gray-900"
          value={tipoPlanta}
          onChange={(e) => setTipoPlanta(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-4 px-6 border border-transparent rounded-lg
                 text-base font-medium text-white bg-green-600 hover:bg-green-700
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                 disabled:bg-green-300 disabled:cursor-not-allowed shadow-lg
                 transition-colors duration-200"
      >
        {loading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Registrando...
          </span>
        ) : (
          'Registrar Ciclo'
        )}
      </button>
    </form>
  );
};

export default CicloForm;