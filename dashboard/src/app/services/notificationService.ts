import { supabase } from '@/app/utils/supabaseClient';
import { PARAMETROS_ETAPAS } from '@/app/constants/parametrosEtapas';
import axios from 'axios';

// Mover las variables de estado al nivel global para persistencia
// (Esto debe ir al principio del archivo)
declare global {
  var monitoringInterval: NodeJS.Timeout | null;
  var isMonitoringActive: boolean;
  var lastNotificationTimes: Record<string, Record<string, number>>;
}

// Inicializar las variables globales si no existen
if (typeof global.monitoringInterval === 'undefined') {
  global.monitoringInterval = null;
}
if (typeof global.isMonitoringActive === 'undefined') {
  global.isMonitoringActive = false;
}
if (typeof global.lastNotificationTimes === 'undefined') {
  global.lastNotificationTimes = {};
}

// Tipos de datos
export interface NotificationSettings {
  enabled: boolean;
  intervalMinutes: number;
  telegramBotToken: string;
  telegramChatId: string;
  etapaMonitoreo: keyof typeof PARAMETROS_ETAPAS;
  monitorTemperature: boolean;
  monitorHumidity: boolean;
  monitorSoilHumidity: boolean;
  notifyInactive: boolean;
}

// Interfaz dummy para mantener compatibilidad
export interface NotificationHistory {
  id: string;
  sensorId: string;
  parameterType: string;
  value: number;
  message: string;
  severity: string;
  created_at: string;
  delivered: boolean;
}

// Variables para almacenar el estado y la configuración en memoria
let localSettings: NotificationSettings = {
  enabled: false,
  intervalMinutes: 10,
  telegramBotToken: '',
  telegramChatId: '',
  etapaMonitoreo: 'Vegetativa',
  monitorTemperature: true,
  monitorHumidity: true,
  monitorSoilHumidity: true,
  notifyInactive: true,
};

// Última vez que se notificó cada tipo de alerta, para evitar spam
let lastNotificationTime: Record<string, Record<string, number>> = {};

// Función para actualizar la configuración
export const updateNotificationSettings = async (settings: Partial<NotificationSettings>): Promise<boolean> => {
  try {
    // Actualizar en memoria
    localSettings = { ...localSettings, ...settings };
    
    console.log('Configuración actualizada en memoria:', localSettings);
    
    // Intentar actualizar en la base de datos
    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({
          enabled: localSettings.enabled,
          interval_minutes: localSettings.intervalMinutes,
          telegram_bot_token: localSettings.telegramBotToken,
          telegram_chat_id: localSettings.telegramChatId,
          etapa_monitoreo: localSettings.etapaMonitoreo,
          monitor_temperature: localSettings.monitorTemperature,
          monitor_humidity: localSettings.monitorHumidity,
          monitor_soil_humidity: localSettings.monitorSoilHumidity,
          notify_inactive: localSettings.notifyInactive,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);
        
      if (error) {
        console.log('Error al actualizar en BD, usando memoria:', error);
      }
    } catch (dbError) {
      // Si hay error en la BD, seguir funcionando con memoria
      console.log('Error con supabase, usando memoria:', dbError);
    }

    return true;
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return false;
  }
};

// Función para obtener la configuración actual
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    // Intentar obtener de la base de datos
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .single();

    if (!error && data) {
      // Actualizar configuración en memoria
      localSettings = {
        enabled: data.enabled || false,
        intervalMinutes: data.interval_minutes || 10,
        telegramBotToken: data.telegram_bot_token || '',
        telegramChatId: data.telegram_chat_id || '',
        etapaMonitoreo: data.etapa_monitoreo || 'Vegetativa',
        monitorTemperature: data.monitor_temperature || true,
        monitorHumidity: data.monitor_humidity || true,
        monitorSoilHumidity: data.monitor_soil_humidity || true,
        notifyInactive: data.notify_inactive || true
      };
    }

    // Usar variables de entorno si están disponibles
    if (process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN) {
      localSettings.telegramBotToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    }
    
    if (process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID) {
      localSettings.telegramChatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
    }

    return { ...localSettings };
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return localSettings;
  }
};

// Función para enviar mensaje a Telegram
export const sendTelegramMessage = async (message: string): Promise<boolean> => {
  try {
    const settings = await getNotificationSettings();
    
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      console.error('Faltan credenciales de Telegram');
      return false;
    }
    
    console.log('Enviando mensaje a Telegram...');
    
    // API de Telegram
    const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: settings.telegramChatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    
    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(`Error en API Telegram: ${response.status} - ${JSON.stringify(responseData)}`);
    }
    
    console.log('Mensaje enviado a Telegram correctamente');
    return true;
  } catch (error) {
    console.error('Error enviando mensaje a Telegram:', error);
    return false;
  }
};

// Función para enviar un mensaje de prueba
export const sendTestMessage = async (): Promise<boolean> => {
  const message = `🧪 *MENSAJE DE PRUEBA* 🧪\n\n` +
    `Sistema de monitoreo funcionando correctamente.\n` +
    `Las alertas se enviarán cuando los valores estén fuera de los rangos establecidos.\n\n` +
    `_Fecha y hora: ${new Date().toLocaleString()}_`;
  
  return await sendTelegramMessage(message);
};

// Función para verificar si se debe enviar una notificación (evitar spam)
const shouldSendNotification = (sensorId: string, paramType: string, value: number): boolean => {
  if (!global.lastNotificationTimes[sensorId]) {
    global.lastNotificationTimes[sensorId] = {};
  }
  
  const now = Date.now();
  const lastTime = global.lastNotificationTimes[sensorId][paramType] || 0;
  // No enviar más de una notificación cada 15 minutos para el mismo sensor y tipo
  const minIntervalMs = 5 * 60 * 1000;
  
  if (now - lastTime > minIntervalMs) {
    global.lastNotificationTimes[sensorId][paramType] = now;
    return true;
  }
  
  return false;
};

// Función para verificar un sensor específico
const checkSensor = async (tableName: string): Promise<void> => {
  try {
    const settings = await getNotificationSettings();
    
    // Obtener últimas lecturas del sensor
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error || !data || data.length === 0) {
      console.log(`No hay datos para ${tableName}`);
      return;
    }
    
    const reading = data[0];
    const sensorNumber = tableName.replace('sensor_', '');
    
    // Verificar si el sensor está inactivo
    const lastReadingTime = new Date(reading.created_at).getTime();
    const currentTime = Date.now();
    const timeDiff = currentTime - lastReadingTime;
    const isInactive = timeDiff > 60 * 60 * 1000; // 1 hora sin datos = inactivo
    
    // Notificar si el sensor está inactivo y la notificación está habilitada
    if (isInactive && settings.notifyInactive && shouldSendNotification(tableName, 'inactive', 0)) {
      const message = `⚠️ *ALERTA: SENSOR INACTIVO* ⚠️\n\n` +
        `El *Sensor ${sensorNumber}* no ha enviado datos en más de 1 hora.\n\n` +
        `Última lectura: ${new Date(lastReadingTime).toLocaleString()}\n` +
        `Tiempo inactivo: ${Math.floor(timeDiff / 3600000)} horas ${Math.floor((timeDiff % 3600000) / 60000)} minutos`;
      
      await sendTelegramMessage(message);
      console.log(`Enviada alerta de inactividad para sensor ${sensorNumber}`);
    }
    
    // No seguir verificando parámetros si el sensor está inactivo
    if (isInactive) return;
    
    // Parámetros según la etapa de crecimiento
    const parametros = PARAMETROS_ETAPAS[settings.etapaMonitoreo];
    
    // Verificar temperatura
    if (settings.monitorTemperature && typeof reading.temperature === 'number') {
      const temp = reading.temperature;
      const { min, max } = parametros.temperatura;
      
      if (temp < min || temp > max) {
        // Severidad basada en qué tan lejos está del rango
        const severity = (temp < min - 5 || temp > max + 5) ? 'critical' : 'warning';
        
        if (shouldSendNotification(tableName, 'temperature', temp)) {
          const message = `${severity === 'critical' ? '🔴' : '🟠'} *ALERTA DE TEMPERATURA* ${severity === 'critical' ? '🔴' : '🟠'}\n\n` +
            `*Sensor ${sensorNumber}*\n` +
            `Temperatura: *${temp.toFixed(1)}°C*\n` +
            `Rango aceptable: ${min}°C - ${max}°C\n\n` +
            `_${new Date().toLocaleString()}_`;
          
          await sendTelegramMessage(message);
          console.log(`Enviada alerta de temperatura para sensor ${sensorNumber}: ${temp}°C`);
        }
      }
    }
    
    // Verificar humedad ambiental
    if (settings.monitorHumidity && typeof reading.humidity === 'number') {
      const humidity = reading.humidity;
      const { min, max } = parametros.humedad;
      
      if (humidity < min || humidity > max) {
        const severity = (humidity < min - 10 || humidity > max + 10) ? 'critical' : 'warning';
        
        if (shouldSendNotification(tableName, 'humidity', humidity)) {
          const message = `${severity === 'critical' ? '🔴' : '🟠'} *ALERTA DE HUMEDAD AMBIENTAL* ${severity === 'critical' ? '🔴' : '🟠'}\n\n` +
            `*Sensor ${sensorNumber}*\n` +
            `Humedad: *${humidity.toFixed(1)}%*\n` +
            `Rango aceptable: ${min}% - ${max}%\n\n` +
            `_${new Date().toLocaleString()}_`;
          
          await sendTelegramMessage(message);
          console.log(`Enviada alerta de humedad para sensor ${sensorNumber}: ${humidity}%`);
        }
      }
    }
    
    // Verificar humedad del suelo
    if (settings.monitorSoilHumidity && typeof reading.soil_humidity === 'number') {
      const soilHumidity = reading.soil_humidity;
      const { min, max } = parametros.humedad_suelo;
      
      if (soilHumidity < min || soilHumidity > max) {
        const severity = (soilHumidity < min - 15 || soilHumidity > max + 15) ? 'critical' : 'warning';
        
        if (shouldSendNotification(tableName, 'soil_humidity', soilHumidity)) {
          const message = `${severity === 'critical' ? '🔴' : '🟠'} *ALERTA DE HUMEDAD DEL SUELO* ${severity === 'critical' ? '🔴' : '🟠'}\n\n` +
            `*Sensor ${sensorNumber}*\n` +
            `Humedad del suelo: *${soilHumidity.toFixed(1)}%*\n` +
            `Rango aceptable: ${min}% - ${max}%\n\n` +
            `_${new Date().toLocaleString()}_`;
          
          await sendTelegramMessage(message);
          console.log(`Enviada alerta de humedad del suelo para sensor ${sensorNumber}: ${soilHumidity}%`);
        }
      }
    }
  } catch (error) {
    console.error(`Error verificando sensor ${tableName}:`, error);
  }
};

// Función actualizada para obtener las tablas de sensores sin depender de pg_tables
const getSensorTables = async (): Promise<string[]> => {
  try {
    // En el cliente, usaremos una lista predefinida o la obtendremos mediante una API
    if (typeof window !== 'undefined') {
      // Intentar obtener mediante API
      try {
        const response = await fetch('/api/sensors/tables');
        if (response.ok) {
          const data = await response.json();
          return data.tables || [];
        }
      } catch (apiError) {
        console.warn('Error obteniendo tablas desde API:', apiError);
      }

      // Si la API falla o no existe, usar una lista predefinida de sensores
      return ['sensor_1', 'sensor_2', 'sensor_3'];
    } 
    else {
      // En el servidor podríamos intentar acceder a pg_tables
      const { data, error } = await supabase
        .rpc('get_sensor_tables');
      
      if (error) throw error;
      
      return data || [];
    }
  } catch (error) {
    console.error('Error obteniendo tablas de sensores:', error);
    
    // Siempre devolver al menos algunos sensores predeterminados
    return ['sensor_1', 'sensor_2', 'sensor_3'];
  }
};

// Verificar todos los sensores
export const checkAllSensors = async (): Promise<void> => {
  try {
    const tables = await getSensorTables();
    console.log(`Verificando ${tables.length} sensores...`);
    
    for (const tableName of tables) {
      await checkSensor(tableName);
    }
    
    console.log('Verificación completada');
  } catch (error) {
    console.error('Error verificando sensores:', error);
  }
};

// Función modificada para iniciar monitoreo que persista
export const startMonitoring = async (intervalMinutes: number = 5): Promise<boolean> => {
  try {
    // Detener cualquier monitoreo existente
    if (global.monitoringInterval) {
      clearInterval(global.monitoringInterval);
      global.monitoringInterval = null;
    }
    
    // Convertir minutos a milisegundos (permitir valores pequeños)
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    
    console.log(`Iniciando monitoreo con intervalo de ${intervalMinutes} minutos`);
    
    // Verificación inicial inmediata
    await checkAllSensors();
    
    // Crear función de verificación periódica
    const periodicCheck = async () => {
      console.log(`Ejecutando verificación programada (${new Date().toLocaleString()})`);
      try {
        await checkAllSensors();
      } catch (error) {
        console.error('Error en verificación programada:', error);
      }
    };
    
    // Configurar intervalo usando la variable global
    global.monitoringInterval = setInterval(periodicCheck, intervalMs);
    global.isMonitoringActive = true;
    
    // Registrar en la configuración que el monitoreo está activado
    await updateNotificationSettings({ 
      enabled: true,
      intervalMinutes: intervalMinutes 
    });
    
    return true;
  } catch (error) {
    console.error('Error al iniciar monitoreo:', error);
    global.isMonitoringActive = false;
    return false;
  }
};

// Detener monitoreo
export const stopMonitoring = async (): Promise<boolean> => {
  try {
    if (global.monitoringInterval) {
      clearInterval(global.monitoringInterval);
      global.monitoringInterval = null;
    }
    
    global.isMonitoringActive = false;
    
    // Actualizar configuración
    await updateNotificationSettings({ enabled: false });
    
    return true;
  } catch (error) {
    console.error('Error al detener monitoreo:', error);
    return false;
  }
};

// Verificar si el monitoreo está activo
export const isMonitoringActive = (): boolean => {
  return global.isMonitoringActive;
};

// Función dummy para mantener compatibilidad
export const getNotificationHistory = async (p0: number): Promise<any[]> => {
  return [];
};

// Inicializa el servicio de notificaciones al cargar la aplicación
export const initializeNotificationService = async (): Promise<void> => {
  try {
    const settings = await getNotificationSettings();
    
    if (settings.enabled) {
      await startMonitoring(settings.intervalMinutes);
    }
  } catch (error) {
    console.error('Error al inicializar servicio de notificaciones:', error);
  }
};