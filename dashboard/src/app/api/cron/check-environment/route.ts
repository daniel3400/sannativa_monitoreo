import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PARAMETROS_ETAPAS } from '@/app/constants/parametrosEtapas';

// Cliente Supabase con la clave de servicio para acceso total
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Función equivalente del lado del servidor para enviar notificaciones
async function sendServerTelegramNotification(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): Promise<boolean> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) {
      console.error('Faltan credenciales de Telegram');
      return false;
    }
    
    // Emoji basado en el tipo
    let emoji = '📢';
    switch (type) {
      case 'success': emoji = '✅'; break;
      case 'warning': emoji = '⚠️'; break;
      case 'error': emoji = '🚨'; break;
      case 'info': default: emoji = 'ℹ️';
    }
    
    const formattedMessage = `${emoji} <b>${type.toUpperCase()}</b>\n\n${message}`;
    
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
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error de Telegram:', errorData);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    return false;
  }
}

// Variable para controlar la frecuencia de las notificaciones (15 minutos)
let lastNotificationTime = 0;

export async function GET(request: Request) {
  try {
    // Verificar clave API
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');
    
    const expectedApiKey = process.env.CRON_API_KEY || 'sannativa-monitoring-key';
    if (apiKey !== expectedApiKey) {
      return NextResponse.json(
        { success: false, error: 'API key inválida' },
        { status: 401 }
      );
    }
    
    // 1. Obtener la etapa actual de cultivo
    let currentStage: keyof typeof PARAMETROS_ETAPAS = 'Vegetativa'; // Default
    
    const { data: configData } = await supabaseAdmin
      .from('sistema_config')
      .select('valor')
      .eq('clave', 'etapa_actual')
      .single();
    
    if (configData && Object.keys(PARAMETROS_ETAPAS).includes(configData.valor)) {
      currentStage = configData.valor as keyof typeof PARAMETROS_ETAPAS;
    }
    
    // 2. Obtener los últimos datos ambientales
    const { data: envData, error: envError } = await supabaseAdmin
      .from('environmental_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (envError || !envData) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron datos ambientales recientes' },
        { status: 404 }
      );
    }
    
    // 3. Verificar si las condiciones están dentro del rango óptimo
    const stageParams = PARAMETROS_ETAPAS[currentStage];
    const nonOptimalConditions = [];
    let isAllOptimal = true;
    
    // Verificar temperatura
    if (envData.temperatura !== undefined) {
      if (envData.temperatura < stageParams.temperatura.min) {
        nonOptimalConditions.push(`🌡️ Temperatura baja: ${envData.temperatura}°C (mínimo: ${stageParams.temperatura.min}°C)`);
        isAllOptimal = false;
      } else if (envData.temperatura > stageParams.temperatura.max) {
        nonOptimalConditions.push(`🌡️ Temperatura alta: ${envData.temperatura}°C (máximo: ${stageParams.temperatura.max}°C)`);
        isAllOptimal = false;
      }
    }
    
    // Verificar humedad
    if (envData.humedad !== undefined) {
      if (envData.humedad < stageParams.humedad.min) {
        nonOptimalConditions.push(`💧 Humedad baja: ${envData.humedad}% (mínimo: ${stageParams.humedad.min}%)`);
        isAllOptimal = false;
      } else if (envData.humedad > stageParams.humedad.max) {
        nonOptimalConditions.push(`💧 Humedad alta: ${envData.humedad}% (máximo: ${stageParams.humedad.max}%)`);
        isAllOptimal = false;
      }
    }
    
    // Verificar humedad del suelo
    if (envData.humedad_suelo !== undefined) {
      if (envData.humedad_suelo < stageParams.humedad_suelo.min) {
        nonOptimalConditions.push(`🌱 Humedad del suelo baja: ${envData.humedad_suelo}% (mínimo: ${stageParams.humedad_suelo.min}%)`);
        isAllOptimal = false;
      } else if (envData.humedad_suelo > stageParams.humedad_suelo.max) {
        nonOptimalConditions.push(`🌱 Humedad del suelo alta: ${envData.humedad_suelo}% (máximo: ${stageParams.humedad_suelo.max}%)`);
        isAllOptimal = false;
      }
    }
    
    // 4. Si hay condiciones no óptimas, enviar notificación (respetando el intervalo)
    const currentTime = Date.now();
    const fifteenMinutesInMs = 15 * 60 * 1000;
    let notificationSent = false;
    
    if (!isAllOptimal && (currentTime - lastNotificationTime >= fifteenMinutesInMs)) {
      const deviceInfo = envData.device_name || envData.device_id || 'Dispositivo desconocido';
      const message = `
⚠️ ALERTA: Condiciones ambientales fuera de rango

📱 Dispositivo: ${deviceInfo}
🌿 Etapa: ${currentStage}
⏰ Fecha y hora: ${new Date(envData.created_at).toLocaleString()}

${nonOptimalConditions.join('\n')}

Por favor, revise y ajuste las condiciones ambientales según la etapa de cultivo.
      `.trim();
      
      const success = await sendServerTelegramNotification(message, 'warning');
      
      if (success) {
        lastNotificationTime = currentTime;
        notificationSent = true;
      }
    }
    
    // 5. Responder con el estado
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stage: currentStage,
      isAllOptimal,
      nonOptimalConditions,
      notificationSent,
      lastDataTimestamp: envData.created_at
    });
  } catch (error: any) {
    console.error('Error en el endpoint de monitoreo:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}