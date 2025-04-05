import { useState, useEffect } from 'react';
import { supabase } from '@/app/utils/supabaseClient';
import { PARAMETROS_ETAPAS } from '@/app/constants/parametrosEtapas';

interface ParametroAlertProps {
  valor: number;
  nombre: string;
  unidad: string;
  tipoParametro: 'temperatura' | 'humedad' | 'humedad_suelo';
  refreshKey?: number;
}

// Mapeo entre nombres de etapas en la BD y nombres en PARAMETROS_ETAPAS
const MAPEO_ETAPAS: Record<string, string> = {
  'Crecimiento vegetativo': 'Vegetativa',
  'Vegetativo': 'Vegetativa',
  'Vegetativa': 'Vegetativa',
  'Germinación': 'Germinación',
  'Floración': 'Floración',
  'Cosecha': 'Cosecha'
};

// Para verificar todas las etapas disponibles
console.log('ETAPAS DISPONIBLES EN PARAMETROS_ETAPAS:', Object.keys(PARAMETROS_ETAPAS));

const ParametroAlert = ({ valor, nombre, unidad, tipoParametro, refreshKey = 0 }: ParametroAlertProps) => {
  const [min, setMin] = useState<number | null>(null);
  const [max, setMax] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [etapaActual, setEtapaActual] = useState<string | null>(null);
  const [etapaOriginal, setEtapaOriginal] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Función para obtener parámetros con refresco forzado
  const obtenerParametros = async (forceFresh = false) => {
    try {
      setLoading(true);
      
      // Consulta a Supabase con opción para forzar refresco
      const { data, error } = await supabase
        .from('ciclos_cultivo')
        .select('etapa_actual')
        .is('fecha_fin', null)
        .single()
        ;  // Eliminado uso de abortSignal ya que no es compatible

      if (error) throw error;
      
      if (data && data.etapa_actual) {
        console.log(`[${nombre}] Etapa original de BD:`, data.etapa_actual);
        setEtapaOriginal(data.etapa_actual);
        
        const etapaMapeada = MAPEO_ETAPAS[data.etapa_actual] || data.etapa_actual;
        console.log(`[${nombre}] Etapa mapeada:`, etapaMapeada);
        setEtapaActual(etapaMapeada);
        
        if (!(etapaMapeada in PARAMETROS_ETAPAS)) {
          console.error(`Etapa "${data.etapa_actual}" mapeada a "${etapaMapeada}" no encontrada en PARAMETROS_ETAPAS`);
          console.error(`Etapas disponibles: ${Object.keys(PARAMETROS_ETAPAS).join(', ')}`);
          setLoading(false);
          return;
        }
        
        const parametrosEtapa = PARAMETROS_ETAPAS[etapaMapeada as keyof typeof PARAMETROS_ETAPAS];
        
        if (!parametrosEtapa || !parametrosEtapa[tipoParametro]) {
          console.error(`Parámetro "${tipoParametro}" no encontrado para etapa "${etapaMapeada}"`);
          setLoading(false);
          return;
        }
        
        setMin(parametrosEtapa[tipoParametro].min);
        setMax(parametrosEtapa[tipoParametro].max);
        
        setLastRefresh(new Date());
        console.log(`[${nombre}] Parámetros actualizados: min=${parametrosEtapa[tipoParametro].min}, max=${parametrosEtapa[tipoParametro].max}`);
      }
    } catch (error) {
      console.error(`[${nombre}] Error al obtener etapa:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Efecto inicial y para refrescos programados
  useEffect(() => {
    console.log(`[${nombre}] Iniciando efecto, refreshKey:`, refreshKey);
    
    // Cargar parámetros iniciales
    obtenerParametros(true);
    
    // Crear timer para recargar cada 15 segundos (como respaldo)
    const timer = setInterval(() => {
      console.log(`[${nombre}] Recarga programada`);
      obtenerParametros(true);
    }, 15000);

    // Suscripción a Supabase
    const channelId = `ciclos_${tipoParametro}_${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'ciclos_cultivo' }, 
        (payload) => {
          console.log(`[${nombre}] Cambio detectado en ciclos_cultivo:`, payload);
          obtenerParametros(true);
        }
      )
      .subscribe((status) => {
        console.log(`[${nombre}] Estado de suscripción:`, status);
      });

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [tipoParametro, refreshKey, nombre]);

  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-gray-500">Cargando parámetros para {nombre}...</p>
      </div>
    );
  }

  if (min === null || max === null) {
    return (
      <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
        <div className="space-y-2">
          <p className="text-yellow-800">No se encontraron rangos para {nombre}</p>
          <p className="text-xs text-yellow-600">Etapa actual: {etapaOriginal || "desconocida"}</p>
          <button 
            onClick={() => obtenerParametros(true)} 
            className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 rounded text-yellow-800"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }

  const estaEnRango = valor >= min && valor <= max;

  return (
    <div className={`p-4 rounded-lg ${estaEnRango ? 'bg-green-50' : 'bg-red-50'} border ${estaEnRango ? 'border-green-200' : 'border-red-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900">{nombre}</h4>
        {!estaEnRango && (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            ⚠️ Alerta
          </span>
        )}
      </div>
      <div className="flex justify-between items-end">
        <div>
          <p className={`text-2xl font-bold ${estaEnRango ? 'text-green-600' : 'text-red-600'}`}>
            {valor.toFixed(1)}{unidad}
          </p>
          <p className="text-sm text-gray-500">
            Rango óptimo: {min}-{max}{unidad}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <p className="text-xs text-gray-400">
              Etapa: {etapaOriginal || "No definida"}
            </p>
            <button 
              onClick={() => obtenerParametros(true)} 
              className="p-1 text-xs text-gray-400 hover:text-gray-600"
              title="Recargar parámetros"
            >
              ↻
            </button>
          </div>
        </div>
        {!estaEnRango && (
          <p className="text-sm text-red-600 font-medium">
            {valor < min ? 'Valor bajo' : 'Valor alto'}
          </p>
        )}
      </div>
    </div>
  );
};

export default ParametroAlert;