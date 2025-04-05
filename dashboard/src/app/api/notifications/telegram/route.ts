import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message, type = 'info' } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Se requiere un mensaje' },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!botToken || !chatId) {
      console.error('Faltan credenciales de Telegram');
      return NextResponse.json(
        { error: 'Configuración de Telegram incompleta' },
        { status: 500 }
      );
    }

    // Añadir emoji según el tipo de notificación
    const emoji = getEmojiByType(type);
    const formattedMessage = `${emoji} <b>${type.toUpperCase()}</b>\n\n${message}`;
    
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: formattedMessage,
          parse_mode: 'HTML',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error de Telegram: ${JSON.stringify(errorData)}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    return NextResponse.json(
      { error: 'Error al enviar notificación' },
      { status: 500 }
    );
  }
}

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