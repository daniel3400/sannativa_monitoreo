import { NextResponse } from 'next/server';
import { startMonitoring } from '@/app/services/notificationService';

export async function POST(request: Request) {
  try {
    const { intervalMinutes } = await request.json();
    
    // Iniciar monitoreo a nivel de servidor
    const success = await startMonitoring(intervalMinutes);
    
    return NextResponse.json({
      success,
      message: success 
        ? `Monitoreo registrado con intervalo de ${intervalMinutes} minutos` 
        : 'Error al registrar monitoreo'
    });
  } catch (error) {
    console.error('Error en API register:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error interno del servidor' 
    }, { status: 500 });
  }
}