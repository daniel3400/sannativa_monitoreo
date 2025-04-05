import axios from 'axios';

// Obtener variables de entorno
const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

// Control de últimas notificaciones para evitar spam
const lastNotifications: Record<string, { timestamp: number, values: Record<string, number> }> = {};

// Tiempo mínimo entre notificaciones similares (en milisegundos) - 30 minutos
const NOTIFICATION_COOLDOWN = 30 * 60 * 1000;

/**
 * Envía una notificación a Telegram
 * @param message El mensaje a enviar
 * @returns Resultado de la operación
 */
export const sendTelegramNotification = async (message: string): Promise<boolean> => {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Error: Faltan las credenciales de Telegram en las variables de entorno');
      return false;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    
    console.log('Notificación enviada a Telegram:', message);
    return true;
  } catch (error) {
    console.error('Error al enviar notificación a Telegram:', error);
    return false;
  }
};

/**
 * Verifica si se debe enviar una notificación para evitar spam
 * @param sensorId ID del sensor
 * @param paramType Tipo de parámetro (temperatura, humedad, etc.)
 * @param currentValue Valor actual
 * @returns true si se debe enviar notificación
 */
export const shouldSendNotification = (
  sensorId: string,
  paramType: string,
  currentValue: number
): boolean => {
  const notificationKey = `${sensorId}_${paramType}`;
  const now = Date.now();
  
  if (
    lastNotifications[notificationKey] && 
    now - lastNotifications[notificationKey].timestamp < NOTIFICATION_COOLDOWN &&
    Math.abs(lastNotifications[notificationKey].values[paramType] - currentValue) < 2
  ) {
    return false;
  }
  
  // Actualizar último registro
  if (!lastNotifications[notificationKey]) {
    lastNotifications[notificationKey] = {
      timestamp: now,
      values: {}
    };
  } else {
    lastNotifications[notificationKey].timestamp = now;
  }
  
  lastNotifications[notificationKey].values[paramType] = currentValue;
  return true;
};