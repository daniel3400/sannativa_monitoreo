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
    setLoading(true);
    try {
      // 1. Finalizar la etapa actual
      const { data: etapaActual, error: errorEtapa } = await supabase
        .from('etapas_ciclo')
        .select('*')
        .eq('ciclo_id', cicloId)
        .is('fecha_fin', null)
        .single();

      if (errorEtapa) throw errorEtapa;

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

      onCicloUpdated();
      if (cicloSeleccionado === cicloId) {
        await cargarPromediosEtapas(cicloId);
      }
    } catch (error) {
      console.error('Error al finalizar ciclo:', error);
      alert('Error al finalizar el ciclo');
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
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-green-200">
              {ciclos.map((ciclo) => (
                <tr 
                  key={ciclo.id_ciclo}
                  onClick={() => cargarPromediosEtapas(ciclo.id_ciclo)}
                  className="hover:bg-green-50 cursor-pointer transition-colors"
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
                        ? 'bg-green-100 text-green-800'
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
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    {!ciclo.fecha_fin && (
                      <>
                        <button
                          onClick={(e) => handleGestionEtapa(e, ciclo.id_ciclo)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700
                                   text-sm inline-flex items-center"
                        >
                          Gestionar Etapa
                        </button>
                        <button
                          onClick={(e) => finalizarCiclo(ciclo.id_ciclo, e)}
                          disabled={loading}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700
                                   disabled:bg-red-300 text-sm inline-flex items-center"
                        >
                          Finalizar Ciclo
                        </button>
                      </>
                    )}
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