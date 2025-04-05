"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/app/utils/supabaseClient';

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

interface CicloInfo {
  id_ciclo: number;
  owner_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  tipo_planta: string;
  numero_plantas: number;
  etapa_actual: string;
}

interface GestionEtapasProps {
  cicloId: number;
  etapaActual: string;
  onEtapaChanged: () => void; // Añadimos esta propiedad
}

const etapasCultivo = [
  'Germinación',
  'Vegetativa',
  'Floración',
  'Cosecha'
] as const;

const GestionEtapas = ({ cicloId, etapaActual, onEtapaChanged }: GestionEtapasProps) => {
  const [etapas, setEtapas] = useState<EtapaPromedio[]>([]);
  const [cicloInfo, setCicloInfo] = useState<CicloInfo | null>(null);
  const [nuevaEtapa, setNuevaEtapa] = useState(etapaActual);
  const [loading, setLoading] = useState(false);
  const [promediosSeleccionados, setPromediosSeleccionados] = useState<EtapaPromedio[]>([]);

  const cargarEtapas = async () => {
    try {
      const { data, error } = await supabase
        .from('etapas_ciclo')
        .select('*')
        .eq('ciclo_id', cicloId)
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;
      setEtapas(data || []);
    } catch (error) {
      console.error('Error cargando etapas:', error);
    }
  };

  const cargarInfoCiclo = async () => {
    try {
      if (!cicloId) {
        console.error('No se proporcionó ID del ciclo');
        return;
      }

      console.log('Cargando información del ciclo:', cicloId);
      
      const { data, error } = await supabase
        .from('ciclos_cultivo')
        .select(`
          id_ciclo,
          owner_id,
          fecha_inicio,
          fecha_fin,
          tipo_planta,
          numero_plantas,
          etapa_actual
        `)
        .eq('id_ciclo', cicloId)
        .single();

      if (error) {
        console.error('Error detallado:', error);
        throw new Error(`Error al cargar información del ciclo: ${error.message}`);
      }

      if (!data) {
        throw new Error('No se encontró información del ciclo');
      }

      console.log('Información del ciclo cargada:', data);
      setCicloInfo(data);
    } catch (error) {
      console.error('Error completo:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Error desconocido al cargar información del ciclo');
      }
    }
  };

  const cambiarEtapa = async () => {
    setLoading(true);
    try {
      // Verificar si ya existe una etapa activa
      const { data: etapasActivas, error: errorBusqueda } = await supabase
        .from('etapas_ciclo')
        .select('*')
        .eq('ciclo_id', cicloId)
        .is('fecha_fin', null);

      if (errorBusqueda) {
        console.error('Error al buscar etapas activas:', errorBusqueda);
        throw new Error('Error al verificar etapas activas');
      }

      // Si hay una etapa activa, finalizarla
      if (etapasActivas && etapasActivas.length > 0) {
        const etapaActual = etapasActivas[0];
        console.log('Finalizando etapa actual:', etapaActual);

        // Calcular promedios
        const { data: promedios, error: errorPromedios } = await supabase
          .rpc('calcular_promedios_etapa', {
            etapa_id: etapaActual.id
          });

        if (errorPromedios) {
          console.error('Error al calcular promedios:', errorPromedios);
          throw new Error('No se pudieron calcular los promedios');
        }

        // Actualizar etapa actual con promedios
        const { error: errorUpdate } = await supabase
          .from('etapas_ciclo')
          .update({
            fecha_fin: new Date().toISOString(),
            temp_promedio: promedios?.[0]?.temp_promedio || 0,
            hum_promedio: promedios?.[0]?.hum_promedio || 0,
            hum_suelo_promedio: promedios?.[0]?.hum_suelo_promedio || 0
          })
          .eq('id', etapaActual.id);

        if (errorUpdate) {
          console.error('Error al actualizar etapa:', errorUpdate);
          throw new Error('Error al finalizar la etapa actual');
        }
      }

      // Crear nueva etapa con referencia al ciclo
      const { error: errorInsert } = await supabase
        .from('etapas_ciclo')
        .insert([{
          ciclo_id: cicloId,
          nombre_etapa: nuevaEtapa,
          fecha_inicio: new Date().toISOString()
        }]);

      if (errorInsert) {
        console.error('Error al crear nueva etapa:', errorInsert);
        throw new Error('Error al crear la nueva etapa');
      }

      // Actualizar etapa_actual en ciclos_cultivo
      const { error: errorUpdateCiclo } = await supabase
        .from('ciclos_cultivo')
        .update({ etapa_actual: nuevaEtapa })
        .eq('id_ciclo', cicloId);

      if (errorUpdateCiclo) {
        console.error('Error al actualizar etapa en ciclo:', errorUpdateCiclo);
        throw new Error('Error al actualizar la etapa del ciclo');
      }

      await cargarEtapas();
      onEtapaChanged();
      alert('Etapa cambiada exitosamente');

    } catch (error) {
      console.error('Error completo:', error);
      alert(error instanceof Error ? error.message : 'Error desconocido al cambiar de etapa');
    } finally {
      setLoading(false);
    }
  };

  const mostrarPromedios = (etapa: EtapaPromedio) => {
    setPromediosSeleccionados([etapa]);
  };

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        await cargarInfoCiclo();
        await cargarEtapas();
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (cicloId) {
      cargarDatos();
    }
  }, [cicloId]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {cicloInfo && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">
            Ciclo #{cicloInfo.id_ciclo}
          </h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <p className="text-sm text-green-600">
              Inicio: {new Date(cicloInfo.fecha_inicio).toLocaleDateString('es-ES')}
            </p>
            <p className="text-sm text-green-600">
              Tipo de planta: {cicloInfo.tipo_planta}
            </p>
            <p className="text-sm text-green-600">
              Número de plantas: {cicloInfo.numero_plantas}
            </p>
            <p className="text-sm text-green-600">
              Etapa actual: {cicloInfo.etapa_actual}
            </p>
            {cicloInfo.fecha_fin && (
              <p className="text-sm text-green-600 col-span-2">
                Finalizado: {new Date(cicloInfo.fecha_fin).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>
        </div>
      )}

      <h3 className="text-xl font-semibold text-green-800 mb-4">
        Etapas del Ciclo
      </h3>

      {/* Lista de etapas anteriores */}
      <div className="space-y-4">
        {etapas.map((etapa) => (
          <div 
            key={etapa.id} 
            className="p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
            onClick={() => mostrarPromedios(etapa)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-green-800">{etapa.nombre_etapa}</h4>
                <p className="text-sm text-green-600">
                  {new Date(etapa.fecha_inicio).toLocaleDateString('es-ES')}
                  {etapa.fecha_fin && ` - ${new Date(etapa.fecha_fin).toLocaleDateString('es-ES')}`}
                </p>
              </div>
              {etapa.fecha_fin && (
                <div className="grid grid-cols-3 gap-4 text-sm bg-white p-4 rounded-md shadow-md border border-green-200">
                  <div className="text-center px-4">
                    <p className="text-green-800 font-semibold mb-2">Temperatura</p>
                    <div className="bg-green-50 py-2 px-3 rounded-lg">
                      <p className="text-gray-900 font-bold text-xl">
                        {etapa.temp_promedio?.toFixed(1)}°C
                      </p>
                    </div>
                  </div>
                  <div className="text-center px-4">
                    <p className="text-green-800 font-semibold mb-2">Humedad</p>
                    <div className="bg-green-50 py-2 px-3 rounded-lg">
                      <p className="text-gray-900 font-bold text-xl">
                        {etapa.hum_promedio?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-center px-4">
                    <p className="text-green-800 font-semibold mb-2">Humedad Suelo</p>
                    <div className="bg-green-50 py-2 px-3 rounded-lg">
                      <p className="text-gray-900 font-bold text-xl">
                        {etapa.hum_suelo_promedio?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sección de promedios detallados */}
      {promediosSeleccionados.length > 0 && (
        <div className="mt-8 border-t-2 border-green-100 pt-6">
          <h3 className="text-xl font-semibold text-green-800 mb-4">
            Detalles de Promedios
          </h3>
          <div className="bg-green-50 p-6 rounded-xl">
            {promediosSeleccionados.map((etapa) => (
              <div key={etapa.id} className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-bold text-green-900">
                    Etapa: {etapa.nombre_etapa}
                  </h4>
                  <span className="text-sm text-green-700">
                    {new Date(etapa.fecha_inicio).toLocaleDateString('es-ES')} - 
                    {etapa.fecha_fin ? new Date(etapa.fecha_fin).toLocaleDateString('es-ES') : 'Actual'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-green-800 font-semibold mb-2">Temperatura Promedio</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {etapa.temp_promedio?.toFixed(1)}°C
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-green-800 font-semibold mb-2">Humedad Promedio</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {etapa.hum_promedio?.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-green-800 font-semibold mb-2">Humedad Suelo Promedio</p>
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

      {/* Selector de nueva etapa */}
      <div className="mt-6">
        <select
          value={nuevaEtapa}
          onChange={(e) => setNuevaEtapa(e.target.value)}
          className="mt-1 block w-full rounded-lg border-2 border-green-300 px-4 py-3
                   shadow-sm focus:border-green-500 focus:ring-green-500 bg-white text-gray-900"
          disabled={loading}
        >
          {etapasCultivo.map((etapa) => (
            <option key={etapa} value={etapa}>
              {etapa}
            </option>
          ))}
        </select>

        <button
          onClick={cambiarEtapa}
          disabled={loading}
          className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md
                   shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                   disabled:bg-green-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Cambiando etapa...' : 'Cambiar a Nueva Etapa'}
        </button>
      </div>
    </div>
  );
};

export default GestionEtapas;