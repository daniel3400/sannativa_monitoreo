"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/app/utils/supabaseClient';

interface Ciclo {
  id_ciclo: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  tipo_planta: string;
  numero_plantas: number;
  owner_id: string;
  etapa_actual: string;
}

interface EtapaPromedio {
  id: number;
  ciclo_id: number;
  nombre_etapa: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  temp_promedio: number | null;
  hum_promedio: number | null;
  hum_suelo_promedio: number | null;
}

const CiclosHistorial = () => {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [cicloSeleccionado, setCicloSeleccionado] = useState<number | null>(null);
  const [etapasCiclo, setEtapasCiclo] = useState<EtapaPromedio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarCiclos();
  }, []);

  const cargarCiclos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargamos solo los ciclos sin información de usuario
      const { data, error } = await supabase
        .from('ciclos_cultivo')
        .select('*')
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error("Error al cargar ciclos:", error);
        throw new Error(`Error al cargar ciclos: ${error.message || JSON.stringify(error)}`);
      }

      console.log("Datos cargados correctamente:", data);
      setCiclos(data || []);
    } catch (error: any) {
      console.error("Error completo:", error);
      setError(error.message || "Error desconocido al cargar ciclos");
    } finally {
      setLoading(false);
    }
  };

  const cargarPromediosEtapas = async (cicloId: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('etapas_ciclo')
        .select('*')
        .eq('ciclo_id', cicloId)
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;
      setEtapasCiclo(data || []);
      setCicloSeleccionado(cicloId);
    } catch (error: any) {
      console.error('Error cargando promedios:', error);
      setError('Error al cargar los promedios de las etapas');
    } finally {
      setLoading(false);
    }
  };

  const finalizarCiclo = async (cicloId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se propague el click a la fila
    setLoading(true);
    try {
      // 1. Finalizar la etapa actual
      const { data: etapaActual, error: errorEtapa } = await supabase
        .from('etapas_ciclo')
        .select('*')
        .eq('ciclo_id', cicloId)
        .is('fecha_fin', null)
        .single();

      if (errorEtapa && errorEtapa.code !== 'PGRST116') {
        // PGRST116 es el código cuando no se encuentra un registro, que podría ser normal
        throw errorEtapa;
      }

      if (etapaActual) {
        // Calcular promedios de la última etapa
        const { data: promedios, error: errorPromedios } = await supabase
          .rpc('calcular_promedios_etapa', {
            etapa_id: etapaActual.id
          });

        if (errorPromedios) throw errorPromedios;

        // Actualizar la etapa actual con los promedios
        const { error: errorUpdate } = await supabase
          .from('etapas_ciclo')
          .update({
            fecha_fin: new Date().toISOString(),
            temp_promedio: promedios?.temp_promedio || 0,
            hum_promedio: promedios?.hum_promedio || 0,
            hum_suelo_promedio: promedios?.hum_suelo_promedio || 0
          })
          .eq('id', etapaActual.id);

        if (errorUpdate) throw errorUpdate;
      }

      // 2. Finalizar el ciclo
      const { error: errorCiclo } = await supabase
        .from('ciclos_cultivo')
        .update({
          fecha_fin: new Date().toISOString()
        })
        .eq('id_ciclo', cicloId);

      if (errorCiclo) throw errorCiclo;

      // Recargar los datos
      await cargarCiclos();
      if (cicloSeleccionado === cicloId) {
        await cargarPromediosEtapas(cicloId);
      }
    } catch (error: any) {
      console.error('Error al finalizar ciclo:', error);
      setError('Error al finalizar el ciclo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    if (!dateString) return 'En progreso';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && ciclos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 shadow-md rounded-lg p-6">
      <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">⚠️</div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Historial de Ciclos de Cultivo</h2>
        <button
          onClick={cargarCiclos}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center text-sm disabled:bg-green-300"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Actualizando...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </>
          )}
        </button>
      </div>

      {/* Tabla de ciclos */}
      <div className="overflow-x-auto shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-green-100">
            <tr>
              {/* Columna de Usuario eliminada */}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo de Planta
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plantas
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Inicio
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fin
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Etapa Actual
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ciclos.map((ciclo) => (
              <tr 
                key={ciclo.id_ciclo} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => cargarPromediosEtapas(ciclo.id_ciclo)}
              >
                {/* Celda de Usuario eliminada */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {ciclo.tipo_planta}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {ciclo.numero_plantas}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(ciclo.fecha_inicio)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {ciclo.fecha_fin ? formatDate(ciclo.fecha_fin) : 'En curso'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${ciclo.etapa_actual === 'Germinacion' ? 'bg-blue-100 text-blue-800' : 
                    ciclo.etapa_actual === 'Vegetativa' ? 'bg-green-100 text-green-800' : 
                    ciclo.etapa_actual === 'Floracion' ? 'bg-purple-100 text-purple-800' : 
                    'bg-yellow-100 text-yellow-800'}`}>
                    {ciclo.etapa_actual}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${!ciclo.fecha_fin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {!ciclo.fecha_fin ? 'Activo' : 'Finalizado'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {!ciclo.fecha_fin && (
                    <button
                      onClick={(e) => finalizarCiclo(ciclo.id_ciclo, e)}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700
                               disabled:bg-red-300 text-xs inline-flex items-center"
                    >
                      Finalizar Ciclo
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {ciclos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron ciclos de cultivo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sección de Promedios por Etapa */}
      {cicloSeleccionado && etapasCiclo.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">
              Promedios por Etapa - Ciclo #{cicloSeleccionado}
            </h3>
            <button
              onClick={() => setCicloSeleccionado(null)}
              className="text-gray-600 hover:text-gray-700"
            >
              Cerrar
            </button>
          </div>
          <div className="space-y-6">
            {etapasCiclo.map((etapa) => (
              <div key={etapa.id} className="bg-gray-50 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-gray-900">
                    {etapa.nombre_etapa}
                  </h4>
                  <span className="text-sm text-gray-700 bg-white px-3 py-1 rounded-full">
                    {formatDate(etapa.fecha_inicio)} - 
                    {etapa.fecha_fin ? formatDate(etapa.fecha_fin) : 'Actual'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-800 font-semibold mb-2">Temperatura</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {etapa.temp_promedio !== null ? etapa.temp_promedio.toFixed(1) + '°C' : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-800 font-semibold mb-2">Humedad</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {etapa.hum_promedio !== null ? etapa.hum_promedio.toFixed(1) + '%' : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-800 font-semibold mb-2">Humedad Suelo</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {etapa.hum_suelo_promedio !== null ? etapa.hum_suelo_promedio.toFixed(1) + '%' : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default CiclosHistorial;