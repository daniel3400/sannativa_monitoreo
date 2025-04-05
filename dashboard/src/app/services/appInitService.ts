import { getNotificationSettings, startMonitoring } from './notificationService';
import { getActiveCycle } from './cultiveService'; // Asumimos que existe este servicio

export const initializeAppServices = async (): Promise<void> => {
  try {
    console.log('Inicializando servicios de la aplicación...');
    
    // Obtener configuración de notificaciones
    const settings = await getNotificationSettings();
    
    // Iniciar monitoreo si está habilitado
    if (settings.enabled) {
      console.log('Iniciando monitoreo automáticamente');
      await startMonitoring(settings.intervalMinutes);
    }
    
    console.log('Servicios inicializados correctamente');
  } catch (error) {
    console.error('Error al inicializar servicios:', error);
  }
};

// Si estamos en el lado del servidor, inicializar inmediatamente
if (typeof window === 'undefined') {
  initializeAppServices();
}