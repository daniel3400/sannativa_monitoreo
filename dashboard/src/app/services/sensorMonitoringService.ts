import { supabase } from '@/app/utils/supabaseClient';
import { PARAMETROS_ETAPAS } from '@/app/constants/parametrosEtapas';
import { sendTelegramNotification, shouldSendNotification } from '@/app/utils/telegramNotifications';

interface SensorReading {
  id: number;
  created_at: string;
  temperature: number;
  humidity: number;
  soil_humidity: number;
}

// Variable para controlar si el monitoreo está activo
let isMonitoringActive = false;

/**
 * Obtiene todas las tablas de sensores disponibles en la base de datos
 */
const getSensorTables = async (): Promise<string[]> => {
  try {
    const tables = [];
    let i = 1;

    while (true) {
      const tableName = `sensor_${i}`;
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      if (error) {
        break; // Si hay error, asumimos que no hay más tablas
      }

      tables.push(tableName);
      i++;
    }

    console.log('Tablas de sensores encontradas:', tables);
    return tables;
  } catch (error) {
    console.error('Error buscando tablas de sensores:', error);
    return [];
  }
};

/**
 * Verifica si un valor está fuera del rango aceptable
 */
const isOutOfRange = (
  value: number, 
  minValue: number, 
  maxValue: number, 
  optimalMin: number, 
  optimalMax: number
): boolean => {
  return value < minValue || value > maxValue;
};

/**
 * Determina la gravedad del problema basado en qué tan lejos está del rango óptimo
 */
const getAlertSeverity = (
  value: number, 
  minValue: number, 
  maxValue: number, 
  optimalMin: number, 
  optimalMax: number
): 'critico' | 'advertencia' => {
  // Determinar la distancia al rango óptimo
  let distanciaOptimal = 0;
  
  if (value < optimalMin) {
    distanciaOptimal = optimalMin - value;
  } else if (value > optimalMax) {
    distanciaOptimal = value - optimalMax;
  }
  
  // Determinar la distancia al rango límite
  let distanciaLimite = 0;
  
  if (value < minValue) {
    distanciaLimite = minValue - value;
  } else if (value > maxValue) {
    distanciaLimite = value - maxValue;
  }
  
  // Si la distancia al límite es mayor que el 50% de la distancia entre óptimo y límite
  // o si directamente está fuera de los límites, es crítico
  if (distanciaLimite > 0 || distanciaOptimal > (Math.max(maxValue - optimalMax, optimalMin - minValue) * 0.5)) {
    return 'critico';
  }
  
  return 'advertencia';
};

/**
 * Verifica los datos más recientes de un sensor y envía notificaciones si es necesario
 */
const checkSensorData = async (tableName: string): Promise<void> => {
  try {
    // Obtener la lectura más reciente
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      console.error(`Error accediendo a ${tableName}:`, error);
      return;
    }

    const sensorReading = data[0] as SensorReading;
    
    // Por ahora usamos la etapa Vegetativa para todos los sensores
    // En el futuro podrías asignar diferentes etapas a diferentes sensores
    const etapa = 'Vegetativa';
    const parametros = PARAMETROS_ETAPAS[etapa];
    
    // Verificar los tres parámetros principales
    const checkAndNotify = async (
      paramName: string, 
      displayName: string, 
      value: number, 
      paramConfig: any,
      unit: string
    ) => {
      if (isOutOfRange(
        value, 
        paramConfig.min, 
        paramConfig.max, 
        paramConfig.optimalMin, 
        paramConfig.optimalMax
      )) {
        // Determinar la gravedad
        const severity = getAlertSeverity(
          value, 
          paramConfig.min, 
          paramConfig.max, 
          paramConfig.optimalMin, 
          paramConfig.optimalMax
        );
        
        // Verificar si debemos enviar notificación
        if (shouldSendNotification(tableName, paramName, value)) {
          // Formatear mensaje según la gravedad
          const emoji = severity === 'critico' ? '⚠️🔴' : '⚠️🟠';
          const message = `${emoji} *ALERTA* ${severity === 'critico' ? 'CRÍTICA' : 'de advertencia'} ${emoji}\n\n` +
            `*Sensor:* ${tableName.replace('sensor_', 'Sensor ')}\n` +
            `*Parámetro:* ${displayName}\n` +
            `*Valor actual:* ${value}${unit}\n` +
            `*Rango óptimo:* ${paramConfig.optimalMin}${unit} - ${paramConfig.optimalMax}${unit}\n` +
            `*Rango aceptable:* ${paramConfig.min}${unit} - ${paramConfig.max}${unit}\n\n` +
            `*Fecha y hora:* ${new Date().toLocaleString('es-ES')}\n` +
            `*Etapa:* ${etapa}`;
            
          await sendTelegramNotification(message);
        }
      }
    };
    
    // Verificar cada parámetro
    await checkAndNotify(
      'temperatura', 
      'Temperatura', 
      sensorReading.temperature, 
      parametros.temperatura,
      '°C'
    );
    
    await checkAndNotify(
      'humedad', 
      'Humedad Ambiental', 
      sensorReading.humidity, 
      parametros.humedad,
      '%'
    );
    
    await checkAndNotify(
      'humedad_suelo', 
      'Humedad del Suelo', 
      sensorReading.soil_humidity, 
      parametros.humedad_suelo,
      '%'
    );
    
  } catch (error) {
    console.error(`Error verificando datos del sensor ${tableName}:`, error);
  }
};

/**
 * Inicia el monitoreo periódico de sensores
 * @param intervalMinutes Intervalo de verificación en minutos (por defecto 10)
 * @returns Función para detener el monitoreo
 */
export const startSensorMonitoring = async (intervalMinutes = 10): Promise<() => void> => {
  // Evitar múltiples instancias del monitoreo
  if (isMonitoringActive) {
    console.log('El monitoreo ya está activo');
    return () => {
      console.log('Nada que detener, el monitoreo ya estaba activo');
    };
  }
  
  isMonitoringActive = true;
  console.log(`Iniciando monitoreo de sensores cada ${intervalMinutes} minutos`);
  
  // Función para ejecutar una ronda de verificación
  const runMonitoringCycle = async () => {
    try {
      // Obtener todas las tablas de sensores
      const sensorTables = await getSensorTables();
      
      if (sensorTables.length === 0) {
        console.warn('No se encontraron sensores para monitorear');
        return;
      }
      
      console.log(`Verificando ${sensorTables.length} sensores...`);
      
      // Verificar cada sensor
      for (const tableName of sensorTables) {
        await checkSensorData(tableName);
      }
      
      console.log('Ciclo de monitoreo completado');
    } catch (error) {
      console.error('Error en ciclo de monitoreo:', error);
    }
  };
  
  // Ejecutar inmediatamente la primera verificación
  await runMonitoringCycle();
  
  // Programar verificaciones periódicas
  const intervalId = setInterval(runMonitoringCycle, intervalMinutes * 60 * 1000);
  
  // Función para detener el monitoreo
  const stopMonitoring = () => {
    clearInterval(intervalId);
    isMonitoringActive = false;
    console.log('Monitoreo de sensores detenido');
  };
  
  // Retornar función para detener el monitoreo si es necesario
  return stopMonitoring;
};

/**
 * Función para verificación manual de sensores (útil para depuración)
 */
export const checkAllSensorsNow = async (): Promise<void> => {
  try {
    const sensorTables = await getSensorTables();
    
    if (sensorTables.length === 0) {
      console.warn('No se encontraron sensores para verificar');
      return;
    }
    
    console.log(`Verificando manualmente ${sensorTables.length} sensores...`);
    
    for (const tableName of sensorTables) {
      await checkSensorData(tableName);
    }
    
    console.log('Verificación manual completada');
  } catch (error) {
    console.error('Error en la verificación manual:', error);
  }
};