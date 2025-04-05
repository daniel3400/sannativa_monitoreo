// Este archivo simula un worker que se ejecuta independientemente del navegador

let workerRunningStatus = false;

// Función para iniciar worker
export const startMonitoringWorker = async (intervalMinutes: number) => {
  // Detener si ya está corriendo
  if (isWorkerRunning()) {
    stopMonitoringWorker();
  }
  
  // Registrar el worker con el servidor
  try {
    const response = await fetch('/api/monitoring/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ intervalMinutes }),
    });
    
    if (!response.ok) {
      throw new Error('Error al registrar el worker');
    }
    
    workerRunningStatus = true;
    return true;
  } catch (error) {
    console.error('Error al iniciar worker:', error);
    return false;
  }
};

// Función para detener worker
export const stopMonitoringWorker = async () => {
  try {
    await fetch('/api/monitoring/unregister', {
      method: 'POST',
    });
    
    workerRunningStatus = false;
    return true;
  } catch (error) {
    console.error('Error al detener worker:', error);
    return false;
  }
};

// Verificar estado
export const isWorkerRunning = () => {
  return workerRunningStatus;
};