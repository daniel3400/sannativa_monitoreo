"use client";

import { useState } from 'react';
import { supabase } from '@/app/utils/supabaseClient';
import GestionEtapas from './GestionEtapas';

interface Ciclo {
  id_ciclo: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  tipo_planta: string;
  numero_plantas: number;
  owner_id: string;
  etapa_actual: string;
  materia_prima_kg: number | null;
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

interface CiclosHistorialProps {
  ciclos: Ciclo[];
  onCicloUpdated: () => void;
}

const CiclosHistorial = ({ ciclos, onCicloUpdated }: CiclosHistorialProps) => {
  const [cicloSeleccionado, setCicloSeleccionado] = useState<number | null>(null);
  const [etapasCiclo, setEtapasCiclo] = useState<EtapaPromedio[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarGestionEtapas, setMostrarGestionEtapas] = useState(false);

  const finalizarCiclo = async (cicloId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se propague el click a la fila

    // 1. Solicitar la cantidad de materia prima
    const materiaPrimaInput = window.prompt('Ingrese la cantidad de materia prima obtenida (en kg):', '0');

    // Validar la entrada
    if (materiaPrimaInput === null) {
      // El usuario canceló el prompt
      return;
    }

    const materiaPrimaKg = parseFloat(materiaPrimaInput);
    if (isNaN(materiaPrimaKg) || materiaPrimaKg < 0) {
      alert('Por favor, ingrese un número válido y positivo para la materia prima.');
      return;
    }

    setLoading(true);
    try {
      // 2. Finalizar la etapa actual
      const { data: etapaActual, error: errorEtapa } = await supabase
        .from('etapas_ciclo')
        .select('*')
        .eq('ciclo_id', cicloId)
        .is('fecha_fin', null)
        .single();

      // Manejo de error si no se encuentra etapa actual o hay error
      if (errorEtapa && errorEtapa.code !== 'PGRST116') { // PGRST116: No rows found
        throw errorEtapa;
      }

      if (etapaActual) {
        // Calcular promedios de la última etapa
        const { data: promedios, error: errorPromedios } = await supabase
          .rpc('calcular_promedios_etapa', {
            etapa_id_param: etapaActual.id
          });

        if (errorPromedios) throw errorPromedios;

        // Actualizar la etapa actual con los promedios y fecha fin
        const { error: errorUpdateEtapa } = await supabase
          .from('etapas_ciclo')
          .update({
            fecha_fin: new Date().toISOString(),
            temp_promedio: promedios?.temp_promedio ?? null,
            hum_promedio: promedios?.hum_promedio ?? null,
            hum_suelo_promedio: promedios?.hum_suelo_promedio ?? null
          })
          .eq('id', etapaActual.id);

        if (errorUpdateEtapa) throw errorUpdateEtapa;
      }

      // 3. Finalizar el ciclo incluyendo la materia prima
      const { error: errorCiclo } = await supabase
        .from('ciclos_cultivo')
        .update({
          fecha_fin: new Date().toISOString(),
          materia_prima_kg: materiaPrimaKg
        })
        .eq('id_ciclo', cicloId);

      if (errorCiclo) throw errorCiclo;

      // 4. Actualizar la UI
      onCicloUpdated();
      if (cicloSeleccionado === cicloId) {
        await cargarPromediosEtapas(cicloId);
      }
      alert(`Ciclo finalizado con ${materiaPrimaKg} kg de materia prima.`);

    } catch (error: any) {
      console.error('Error al finalizar ciclo:', error);
      alert(`Error al finalizar el ciclo: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const cargarPromediosEtapas = async (cicloId: number) => {
    try {
      const { data, error } = await supabase
        .from('etapas_ciclo')
        .select('*')
        .eq('ciclo_id', cicloId)
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;
      setEtapasCiclo(data || []);
      setCicloSeleccionado(cicloId);
    } catch (error) {
      console.error('Error cargando promedios:', error);
      alert('Error al cargar los promedios de las etapas');
    }
  };

  const handleGestionEtapa = (e: React.MouseEvent, cicloId: number) => {
    e.stopPropagation();
    setCicloSeleccionado(cicloId);
    setMostrarGestionEtapas(true);
  };

  return (
    <div className="space-y-6">
      {/* Tabla de ciclos */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-green-800 mb-6">
          Historial de Ciclos
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-green-200">
            <thead className="bg-green-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                  Fecha Inicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                  Fecha Fin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                  Tipo Planta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                  Número Plantas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                  Etapa Actual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                  Materia Prima (kg)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-green-200">
              {ciclos.map((ciclo) => (
                <tr 
                  key={ciclo.id_ciclo}
                  onClick={() => cargarPromediosEtapas(ciclo.id_ciclo)}
                  className={`hover:bg-green-50 cursor-pointer transition-colors ${cicloSeleccionado === ciclo.id_ciclo ? 'bg-green-100' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(ciclo.fecha_inicio).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ciclo.fecha_fin ? new Date(ciclo.fecha_fin).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'En curso'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ciclo.tipo_planta}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ciclo.numero_plantas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ciclo.fecha_fin === null
                        ? 'bg-green-100 text-green-800 animate-pulse'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {ciclo.fecha_fin === null ? 'Activo' : 'Finalizado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                      {ciclo.etapa_actual}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ciclo.fecha_fin ? (ciclo.materia_prima_kg !== null ? `${ciclo.materia_prima_kg} kg` : 'N/A') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2 text-sm">
                    {!ciclo.fecha_fin && (
                      <>
                        <button
                          onClick={(e) => handleGestionEtapa(e, ciclo.id_ciclo)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700
                                   inline-flex items-center shadow-sm transition-colors"
                          title="Gestionar etapas del ciclo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 16v-2m0-10v2m0 6v2M6 12H4m16 0h-2m-10 0h2m6 0h2M9 18l-3-3 3-3M15 6l3 3-3 3" />
                          </svg>
                          Etapas
                        </button>
                        <button
                          onClick={(e) => finalizarCiclo(ciclo.id_ciclo, e)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700
                                   disabled:bg-red-300 inline-flex items-center shadow-sm transition-colors"
                          title="Finalizar este ciclo de cultivo"
                        >
                          {loading ? (
                            <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          Finalizar
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => cargarPromediosEtapas(ciclo.id_ciclo)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300
                               inline-flex items-center shadow-sm transition-colors"
                      title="Ver detalles y promedios del ciclo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel de Gestión de Etapas */}
      {mostrarGestionEtapas && cicloSeleccionado && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-green-800">
              Gestión de Etapas del Ciclo
            </h3>
            <button
              onClick={() => {
                setMostrarGestionEtapas(false);
                cargarPromediosEtapas(cicloSeleccionado);
              }}
              className="text-green-600 hover:text-green-700"
            >
              Cerrar
            </button>
          </div>
          <GestionEtapas 
            cicloId={cicloSeleccionado}
            etapaActual={ciclos.find(c => c.id_ciclo === cicloSeleccionado)?.etapa_actual || 'Germinación'}
            onEtapaChanged={async () => {
              onCicloUpdated();
              await cargarPromediosEtapas(cicloSeleccionado);
            }}
          />
        </div>
      )}

      {/* Sección de Promedios por Etapa */}
      {cicloSeleccionado && etapasCiclo.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-green-800 mb-6">
            Promedios por Etapa - Ciclo #{cicloSeleccionado}
          </h3>
          <div className="space-y-6">
            {etapasCiclo.map((etapa) => (
              <div key={etapa.id} className="bg-green-50 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-green-900">
                    {etapa.nombre_etapa}
                  </h4>
                  <span className="text-sm text-green-700 bg-white px-3 py-1 rounded-full">
                    {new Date(etapa.fecha_inicio).toLocaleDateString('es-ES')} - 
                    {etapa.fecha_fin ? new Date(etapa.fecha_fin).toLocaleDateString('es-ES') : 'Actual'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-green-800 font-semibold mb-2">Temperatura</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {etapa.temp_promedio?.toFixed(1)}°C
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-green-800 font-semibold mb-2">Humedad</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {etapa.hum_promedio?.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-green-800 font-semibold mb-2">Humedad Suelo</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {etapa.hum_suelo_promedio?.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CiclosHistorial;