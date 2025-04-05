export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface TelegramNotificationOptions {
  type?: NotificationType;
}

// Determinar si estamos en modo desarrollo
const isDev = process.env.NODE_ENV === 'development';

/**
 * Envía una notificación a través de Telegram
 */
export async function sendTelegramNotification(
  message: string,
  options: TelegramNotificationOptions = {}
): Promise<boolean> {
  try {
    console.log('telegramService: Iniciando envío de notificación');
    
    // Obtener valores de variables de entorno
    const token = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
    
    console.log('telegramService: Variables de entorno:', {
      tokenExists: !!token,
      tokenLength: token ? token.length : 0,
      chatIdExists: !!chatId,
      chatIdValue: chatId || 'No disponible'
    });
    
    // En desarrollo, si faltan credenciales, podemos simular
    if ((!token || !chatId) && isDev) {
      const emoji = getEmojiByType(options.type || 'info');
      console.log(`[TELEGRAM SIMULADO ${options.type?.toUpperCase()}] ${emoji} ${message}`);
      return true;
    }
    
    // Verificar que existan las credenciales
    if (!token || !chatId) {
      console.error('telegramService: Faltan credenciales de Telegram en variables de entorno');
      return false;
    }

    // Añadir emoji según el tipo
    const emoji = getEmojiByType(options.type || 'info');
    const formattedMessage = `${emoji} <b>${(options.type || 'info').toUpperCase()}</b>\n\n${message}`;
    
    console.log('telegramService: Preparando solicitud a API de Telegram');
    
    // Enviar la solicitud
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedMessage,
        parse_mode: 'HTML',
      }),
    });
    
    console.log('telegramService: Respuesta recibida, estado:', response.status);
    
    // Obtener la respuesta completa para diagnóstico
    const responseData = await response.json();

    // Verificar si fue exitoso
    if (!response.ok) {
      console.error('telegramService: Error de API de Telegram:', responseData);
      return false;
    }

    console.log('telegramService: Mensaje enviado exitosamente');
    return true;
  } catch (error) {
    console.error('telegramService: Error al enviar notificación:', error);
    return false;
  }
}

/**
 * Obtiene el emoji correspondiente al tipo de notificación
 */
function getEmojiByType(type: string): string {
  switch (type.toLowerCase()) {
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '🚨';
    case 'info':
    default:
      return 'ℹ️';
  }
}