import { NextResponse } from 'next/server';
import { stopMonitoring } from '@/app/services/notificationService';

export async function POST() {
  try {
    const success = await stopMonitoring();
    
    return NextResponse.json({
      success,
      message: success 
        ? 'Monitoreo detenido correctamente' 
        : 'Error al detener monitoreo'
    });
  } catch (error) {
    console.error('Error en API unregister:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error interno del servidor' 
    }, { status: 500 });
  }
}