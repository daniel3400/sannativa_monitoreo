import { supabase } from '@/app/utils/supabaseClient';

export interface CultiveCycle {
  id_ciclo: number;        // Campo renombrado: id -> id_ciclo
  owner_id: string;        // Campo nuevo: ID del propietario del ciclo
  fecha_inicio: string;    // Campo renombrado: start_date -> fecha_inicio
  fecha_fin: string | null; // Campo renombrado: end_date -> fecha_fin
  tipo_planta: string;     // Campo nuevo: tipo de planta cultivada
  numero_plantas: number;  // Campo nuevo: cantidad de plantas
  etapa_actual: string;    // Campo renombrado: stage -> etapa_actual
}

// Etapa por defecto cuando no hay ciclo activo
const DEFAULT_STAGE = 'Vegetativa';

// Mapeo de etapas a formato estandarizado
const stageMapping: Record<string, string> = {
  'vegetativa': 'Vegetativa',
  'floracion': 'Floracion',
  'germinacion': 'Germinacion',
  
  // valores en inglés por si acaso
  'vegetative': 'Vegetativa',
  'flowering': 'Floracion',
  'seedling': 'Germinacion',
  
};

// Obtener ciclo activo con manejo robusto de errores
export const getActiveCycle = async (): Promise<CultiveCycle | null> => {
  try {
    // Primero verificar si la tabla existe
    try {
      const { error: tableError } = await supabase
        .from('ciclos_cultivo')
        .select('count')
        .limit(1);
      
      if (tableError) {
        console.warn('La tabla ciclos_cultivo no existe o no es accesible:', tableError.message);
        return null;
      }
    } catch (tableCheckError) {
      console.warn('Error verificando tabla ciclos_cultivo:', tableCheckError);
      return null;
    }
    
    // Intentar obtener el ciclo activo (el que tiene fecha_fin NULL)
    const { data, error } = await supabase
      .from('ciclos_cultivo')
      .select('*')
      .is('fecha_fin', null)  // El ciclo activo tiene fecha_fin = null
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle(); // Usar maybeSingle para evitar errores si no hay resultados
    
    if (error) {
      console.warn('Error consultando ciclo activo:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error general en getActiveCycle:', error);
    return null;
  }
};

// Obtener etapa de crecimiento actual (con fallback si no hay ciclo activo)
export const getCurrentGrowthStage = async (): Promise<string> => {
  try {
    const cycle = await getActiveCycle();
    
    if (cycle && cycle.etapa_actual) {
      // Usar el mapeo para normalizar la etapa
      return stageMapping[cycle.etapa_actual.toLowerCase()] || DEFAULT_STAGE;
    }
    
    return DEFAULT_STAGE;
  } catch (error) {
    console.error('Error obteniendo etapa actual:', error);
    return DEFAULT_STAGE;
  }
};

// Obtener todos los ciclos
export const getAllCycles = async (): Promise<CultiveCycle[]> => {
  try {
    // Verificar tabla primero
    try {
      const { error: tableError } = await supabase
        .from('ciclos_cultivo')
        .select('count')
        .limit(1);
      
      if (tableError) {
        console.warn('La tabla ciclos_cultivo no existe o no es accesible');
        return [];
      }
    } catch (tableCheckError) {
      console.warn('Error verificando tabla:', tableCheckError);
      return [];
    }
    
    const { data, error } = await supabase
      .from('ciclos_cultivo')
      .select('*')
      .order('fecha_inicio', { ascending: false });
    
    if (error) {
      console.warn('Error consultando ciclos:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error general en getAllCycles:', error);
    return [];
  }
};

// Crear nuevo ciclo de cultivo
export const createCycle = async (
  cycle: Omit<CultiveCycle, 'id_ciclo' | 'fecha_fin'>
): Promise<CultiveCycle | null> => {
  try {
    // Asegurar que fecha_fin sea null para indicar que es un ciclo activo
    const newCycle = { 
      ...cycle, 
      fecha_fin: null 
    };
    
    // Comprobar si ya existe un ciclo activo
    const activeCycle = await getActiveCycle();
    if (activeCycle) {
      console.warn('Ya existe un ciclo activo. Finaliza el ciclo actual antes de crear uno nuevo.');
      return null;
    }
    
    const { data, error } = await supabase
      .from('ciclos_cultivo')
      .insert(newCycle)
      .select()
      .single();
    
    if (error) {
      console.error('Error creando ciclo:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error general creando ciclo:', error);
    return null;
  }
};

// Actualizar ciclo existente
export const updateCycle = async (id_ciclo: number, changes: Partial<CultiveCycle>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ciclos_cultivo')
      .update(changes)
      .eq('id_ciclo', id_ciclo);
    
    if (error) {
      console.error('Error actualizando ciclo:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error general actualizando ciclo:', error);
    return false;
  }
};

// Finalizar ciclo activo
export const finishActiveCycle = async (): Promise<boolean> => {
  try {
    const activeCycle = await getActiveCycle();
    if (!activeCycle) {
      console.warn('No hay ciclo activo para finalizar');
      return false;
    }
    
    const changes = {
      fecha_fin: new Date().toISOString(),
    };
    
    return await updateCycle(activeCycle.id_ciclo, changes);
  } catch (error) {
    console.error('Error al finalizar ciclo activo:', error);
    return false;
  }
};

// Cambiar etapa del ciclo activo
export const changeActiveStage = async (newStage: string): Promise<boolean> => {
  try {
    const activeCycle = await getActiveCycle();
    if (!activeCycle) {
      console.warn('No hay ciclo activo para cambiar de etapa');
      return false;
    }
    
    return await updateCycle(activeCycle.id_ciclo, { etapa_actual: newStage });
  } catch (error) {
    console.error('Error cambiando etapa del ciclo activo:', error);
    return false;
  }
};

// Obtener ciclo por ID
export const getCycleById = async (id_ciclo: number): Promise<CultiveCycle | null> => {
  try {
    const { data, error } = await supabase
      .from('ciclos_cultivo')
      .select('*')
      .eq('id_ciclo', id_ciclo)
      .single();
    
    if (error) {
      console.warn(`Error obteniendo ciclo con ID ${id_ciclo}:`, error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Error general obteniendo ciclo con ID ${id_ciclo}:`, error);
    return null;
  }
};

// Obtener ciclos por propietario
export const getCyclesByOwner = async (owner_id: string): Promise<CultiveCycle[]> => {
  try {
    const { data, error } = await supabase
      .from('ciclos_cultivo')
      .select('*')
      .eq('owner_id', owner_id)
      .order('fecha_inicio', { ascending: false });
    
    if (error) {
      console.warn(`Error obteniendo ciclos del propietario ${owner_id}:`, error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error general obteniendo ciclos del propietario ${owner_id}:`, error);
    return [];
  }
};

// Obtener estadísticas de ciclos
export const getCyclesStatistics = async (): Promise<{
  total: number;
  active: number;
  completed: number;
  averageDuration: number | null;
}> => {
  try {
    const allCycles = await getAllCycles();
    
    const active = allCycles.filter(cycle => cycle.fecha_fin === null).length;
    const completed = allCycles.filter(cycle => cycle.fecha_fin !== null).length;
    
    // Calcular duración promedio de ciclos completados
    let totalDuration = 0;
    let countForAverage = 0;
    
    for (const cycle of allCycles) {
      if (cycle.fecha_fin && cycle.fecha_inicio) {
        const startDate = new Date(cycle.fecha_inicio);
        const endDate = new Date(cycle.fecha_fin);
        const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (!isNaN(durationDays) && durationDays > 0) {
          totalDuration += durationDays;
          countForAverage++;
        }
      }
    }
    
    const averageDuration = countForAverage > 0 ? totalDuration / countForAverage : null;
    
    return {
      total: allCycles.length,
      active,
      completed,
      averageDuration
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de ciclos:', error);
    return {
      total: 0,
      active: 0,
      completed: 0,
      averageDuration: null
    };
  }
};