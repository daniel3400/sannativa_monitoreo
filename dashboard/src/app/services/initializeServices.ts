import { startSensorMonitoring } from './sensorMonitoringService';

// Función para inicializar todos los servicios necesarios
export const initializeServices = async (): Promise<void> => {
  try {
    // Iniciar el monitoreo de sensores con verificaciones cada 10 minutos
    await startSensorMonitoring(10);
    
    console.log('Servicios inicializados correctamente');
  } catch (error) {
    console.error('Error inicializando servicios:', error);
  }
};