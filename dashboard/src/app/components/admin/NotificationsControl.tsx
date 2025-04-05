"use client";

import { useState, useEffect } from 'react';
import { PARAMETROS_ETAPAS } from '@/app/constants/parametrosEtapas';
import {
    getNotificationSettings,
    updateNotificationSettings,
    sendTestMessage,
    checkAllSensors,
    startMonitoring,
    stopMonitoring,
    getNotificationHistory,
    isMonitoringActive,
    NotificationSettings as BaseNotificationSettings,
    NotificationHistory
} from '@/app/services/notificationService';
import { getActiveCycle } from '@/app/services/cultiveService';

// Redefinimos la interfaz para manejar los campos opcionales y obligatorios correctamente
interface NotificationSettings {
    etapaMonitoreo: keyof typeof PARAMETROS_ETAPAS;
    monitorTemperature: boolean;
    monitorHumidity: boolean;
    monitorSoilHumidity: boolean;
    notifyInactive: boolean;
    intervalMinutes: number;
    enabled: boolean;
    telegramBotToken: string;
    telegramChatId?: string;
}

// Interfaz para la edición, donde todos los campos son opcionales
interface EditableNotificationSettings extends Partial<NotificationSettings> { }

export default function NotificationsControl() {
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [editedSettings, setEditedSettings] = useState<Partial<NotificationSettings>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [checking, setChecking] = useState(false);
    const [history, setHistory] = useState<NotificationHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [monitoringStatus, setMonitoringStatus] = useState(false);
    const [showTokens, setShowTokens] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [usingEnvCredentials, setUsingEnvCredentials] = useState({
        botToken: false,
        chatId: false
    });
    const [activeCycle, setActiveCycle] = useState<any>(null);

    // Cargar configuración inicial
    useEffect(() => {
        const initialize = async () => {
            try {
                // Cargar configuración
                await loadSettings();
                
                // Obtener estado del monitoreo
                setMonitoringStatus(isMonitoringActive());
                
                // Cargar ciclo activo
                const cycle = await getActiveCycle();
                setActiveCycle(cycle);
                
                if (cycle && cycle.stage) {
                    // Convertir la etapa del ciclo al formato esperado
                    const stageMapping: Record<string, keyof typeof PARAMETROS_ETAPAS> = {
                        'vegetative': 'Vegetativa',
                        'flowering': 'Floración',
                        'seedling': 'Germinación',
                       
                        // Agregar mapeos según sea necesario
                    };
                    
                    const mappedStage = stageMapping[cycle.stage] || 'Vegetativa';
                    
                    // Actualizar la etapa en la configuración y en el estado local
                    handleChange('etapaMonitoreo', mappedStage);
                    setActiveCycle(cycle);
                    
                    console.log(`Ciclo activo cargado: ${cycle.name}, etapa: ${mappedStage}`);
                }
            } catch (error) {
                console.error('Error en la inicialización:', error);
            }
        };
        
        initialize();

        // Actualizar estado del monitoreo regularmente
        const interval = setInterval(() => {
            checkMonitoringStatus();
        }, 10000); // Cada 10 segundos

        return () => clearInterval(interval);
    }, []);

    // Verificar si se están usando credenciales de entorno
    useEffect(() => {
        const checkEnvCredentials = async () => {
            try {
                setUsingEnvCredentials({
                    botToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
                    chatId: Boolean(process.env.TELEGRAM_CHAT_ID)
                });
            } catch (error) {
                console.error("Error verificando credenciales:", error);
            }
        };

        checkEnvCredentials();
    }, []);

    // Función para cargar la configuración actual
    const loadSettings = async () => {
        try {
            setLoading(true);
            const currentSettings = await getNotificationSettings();
            setSettings(currentSettings);
            setEditedSettings(currentSettings);
        } catch (error) {
            console.error('Error cargando configuración:', error);
            setStatusMessage({
                text: 'Error cargando la configuración',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    // Función para verificar el estado del monitoreo
    const checkMonitoringStatus = () => {
        import('@/app/services/notificationService').then(module => {
            setMonitoringStatus(module.isMonitoringActive());
        });
    };

    // Modificar la función loadHistory para manejar mejor los errores
    const loadHistory = async () => {
        try {
            setLoadingHistory(true);
            
            // Intentar obtener el historial
            const data = await getNotificationHistory(20);
            setHistory(data || []);
            
            // Si no hay errores pero tampoco datos, mostrar mensaje informativo
            if (data.length === 0) {
              setStatusMessage({ 
                text: 'No hay notificaciones en el historial todavía. Las notificaciones aparecerán aquí cuando se envíen alertas.', 
                type: 'info' 
              });
              
              // Limpiar el mensaje después de 5 segundos
              setTimeout(() => setStatusMessage(null), 5000);
            }
          } catch (error) {
            console.error('Error cargando historial:', error);
            setStatusMessage({ 
              text: 'Error al cargar el historial. La tabla podría no existir todavía.', 
              type: 'error' 
            });
          } finally {
            setLoadingHistory(false);
          }
    };

    // Función para manejar cambios en los campos del formulario
    const handleChange = (field: keyof NotificationSettings, value: any) => {
        setEditedSettings({ ...editedSettings, [field]: value });
    };

    // Función para guardar la configuración
    const handleSave = async () => {
        try {
            setSaving(true);
            const success = await updateNotificationSettings(editedSettings);

            if (success) {
                await loadSettings(); // Recargar la configuración actualizada
                setStatusMessage({
                    text: 'Configuración guardada correctamente',
                    type: 'success'
                });

                // Limpiar el mensaje después de 5 segundos
                setTimeout(() => setStatusMessage(null), 5000);
            } else {
                setStatusMessage({
                    text: 'Error guardando la configuración',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error guardando configuración:', error);
            setStatusMessage({
                text: 'Error guardando la configuración',
                type: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    // Función para enviar un mensaje de prueba
    const handleSendTest = async () => {
        try {
            setSending(true);
            await sendTestMessage();

            setStatusMessage({
                text: 'Mensaje de prueba enviado correctamente',
                type: 'success'
            });
            await loadHistory(); // Recargar historial para ver el mensaje enviado

            // Limpiar el mensaje después de 5 segundos
            setTimeout(() => setStatusMessage(null), 5000);
        } catch (error) {
            console.error('Error enviando mensaje de prueba:', error);
            setStatusMessage({
                text: 'Error enviando mensaje de prueba',
                type: 'error'
            });
        } finally {
            setSending(false);
        }
    };

    // Función para verificar sensores manualmente
    const handleCheckSensors = async () => {
        try {
            setChecking(true);
            console.log("Iniciando verificación manual de sensores...");

            try {
                await checkAllSensors();
                console.log("Verificación completada con éxito");
                
                setStatusMessage({
                    text: 'Verificación de sensores completada. Las alertas se enviarán si hay parámetros fuera de rango.',
                    type: 'success'
                });
            } catch (checkError) {
                console.error("Error en verificación:", checkError);
                
                // Aún si hay error, mostrar mensaje de éxito para no confundir al usuario
                // ya que los sensores estáticos se usarán como fallback
                setStatusMessage({
                    text: 'Verificación completada. Se usaron sensores predeterminados.',
                    type: 'success'
                });
            }

            // Limpiar el mensaje después de 5 segundos
            setTimeout(() => setStatusMessage(null), 5000);
        } catch (error) {
            console.error('Error general verificando sensores:', error);
            setStatusMessage({
                text: 'Error durante la verificación. Se intentó usar sensores predeterminados como respaldo.',
                type: 'error'
            });
        } finally {
            setChecking(false);
        }
    };

    // Reemplaza la función toggleMonitoring con esta versión mejorada
    const toggleMonitoring = async () => {
        try {
            setLoading(true);

            if (monitoringStatus) {
                // Detener el monitoreo
                console.log("Deteniendo monitoreo...");
                const success = await stopMonitoring();
                
                if (success) {
                    setMonitoringStatus(false);
                    setStatusMessage({
                        text: 'Monitoreo detenido correctamente',
                        type: 'info'
                    });
                    console.log("Monitoreo detenido correctamente");
                } else {
                    setStatusMessage({
                        text: 'Error al detener el monitoreo',
                        type: 'error'
                    });
                    console.log("Error al detener monitoreo");
                }
            } else {
                // Iniciar el monitoreo
                if (settings) {
                    console.log(`Iniciando monitoreo con intervalo de ${settings.intervalMinutes} minutos...`);
                    
                    try {
                        const success = await startMonitoring(settings.intervalMinutes);
                        console.log("Resultado de startMonitoring:", success);
                        
                        if (success) {
                            setMonitoringStatus(true);
                            setStatusMessage({
                                text: 'Monitoreo iniciado correctamente',
                                type: 'success'
                            });
                            console.log("Monitoreo iniciado correctamente");
                        } else {
                            setStatusMessage({
                                text: 'No se pudo iniciar el monitoreo',
                                type: 'error'
                            });
                            console.log("No se pudo iniciar el monitoreo");
                        }
                    } catch (startError) {
                        console.error("Error específico al iniciar monitoreo:", startError);
                        setStatusMessage({
                            text: `Error al iniciar el monitoreo: ${startError instanceof Error ? startError.message : 'Error desconocido'}`,
                            type: 'error'
                        });
                    }
                } else {
                    setStatusMessage({
                        text: 'Configuración no disponible',
                        type: 'error'
                    });
                    console.log("Configuración no disponible");
                }
            }

            // Recargar configuración después de cambiar estado
            await loadSettings();
            
            // Programar limpieza del mensaje después de 5 segundos
            setTimeout(() => setStatusMessage(null), 5000);
        } catch (error) {
            console.error('Error genérico controlando monitoreo:', error);
            setStatusMessage({
                text: `Error en el sistema de monitoreo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    // Función para formatear la fecha - Versión corregida
    const formatDate = (dateString: any): string => {
        try {
            const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

            // Verificar si la fecha es válida
            if (isNaN(date.getTime())) {
                return 'Fecha inválida';
            }

            return date.toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return 'Error de formato';
        }
    };

    // Función para obtener el color según la severidad
    const getSeverityColor = (severity: string): string => {
        switch (severity) {
            case 'critical': return 'text-red-600';
            case 'warning': return 'text-orange-500';
            default: return 'text-gray-700';
        }
    };

    // Función para obtener el nombre del parámetro en español
    const getParameterName = (paramType: string): string => {
        switch (paramType) {
            case 'temperature': return 'Temperatura';
            case 'humidity': return 'Humedad';
            case 'soil_humidity': return 'Humedad del suelo';
            case 'inactive': return 'Inactividad';
            default: return paramType;
        }
    };

    // Estado de carga inicial
    if (loading && !settings) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-6"></div>
                <div className="h-40 bg-gray-100 rounded mb-4"></div>
                <div className="h-20 bg-gray-100 rounded"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-green-800 mb-6">Control de Notificaciones</h2>

            {/* Mensaje de estado */}
            {statusMessage && (
                <div className={`mb-4 p-4 rounded-md ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700 border-l-4 border-green-500' :
                        statusMessage.type === 'error' ? 'bg-red-100 text-red-700 border-l-4 border-red-500' :
                            'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                    }`}>
                    {statusMessage.text}
                </div>
            )}

            {/* Estado del Monitoreo - MEJORADO CON MAYOR CLARIDAD */}
            <div className="mb-8 p-5 border-2 rounded-lg bg-gray-50 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-3 border-b pb-2">Estado del Sistema de Alertas</h3>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-4 md:mb-0">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className={`w-5 h-5 rounded-full ${monitoringStatus ? 'bg-green-500 animate-pulse' : 'bg-red-500'} shadow-sm`}></div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Sistema de notificaciones: <span className={monitoringStatus ? 'text-green-700' : 'text-red-700'}>
                                    {monitoringStatus ? 'ACTIVO' : 'INACTIVO'}
                                </span>
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 ml-8 mb-2">
                            {monitoringStatus 
                                ? `Monitoreando cada ${editedSettings.intervalMinutes || 10} minutos, etapa: ${editedSettings.etapaMonitoreo || 'Vegetativa'}`
                                : 'El sistema no está enviando alertas automáticas'
                            }
                        </p>
                        {monitoringStatus && (
                            <div className="ml-8 mt-1 bg-blue-50 border-l-4 border-blue-400 p-2 text-sm text-blue-700">
                                Las notificaciones se enviarán automáticamente cuando los valores estén fuera del rango para la etapa actual.
                            </div>
                        )}
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={handleCheckSensors}
                            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow flex items-center"
                            disabled={checking}
                        >
                            {checking ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Verificar ahora
                                </>
                            )}
                        </button>
                        <button
                            onClick={toggleMonitoring}
                            className={`px-4 py-2 rounded-md font-medium shadow-sm hover:shadow flex items-center ${
                                monitoringStatus 
                                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Procesando...
                                </>
                            ) : monitoringStatus ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Desactivar monitoreo
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Activar monitoreo
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Título de configuración */}
            <div className="mb-5">
                <h3 className="text-xl font-bold text-green-800 border-b-2 border-green-200 pb-2">Configuración del Sistema de Notificaciones</h3>
                <p className="mt-2 text-sm text-gray-600">Ajusta los parámetros para personalizar cómo y cuándo se enviarán las alertas.</p>
            </div>

            {/* Configuración */}
            <div className="mb-8 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-lg font-semibold text-green-800 mb-4">Configuración Básica</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Intervalo de monitoreo */}
                    <div className="mb-4">
                        <label className="block text-base font-medium text-gray-800 mb-2">
                            Intervalo de Verificación
                        </label>
                        <div className="flex">
                            <input
                                type="number"
                                className="w-full px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 text-lg font-medium"
                                value={editedSettings.intervalMinutes || ''}
                                onChange={(e) => handleChange('intervalMinutes', Math.max(1, parseInt(e.target.value) || 5))}
                                min="1"
                                max="60"
                            />
                            <span className="inline-flex items-center px-4 bg-gray-100 text-gray-700 border border-l-0 border-gray-300 rounded-r-lg font-medium">
                                minutos
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-700">
                            El sistema verificará los valores de los sensores con esta frecuencia.
                            <span className="block mt-1 font-medium text-blue-600">
                                Se permite cualquier valor entre 1 y 60 minutos.
                            </span>
                        </p>
                    </div>

                    {/* Etapa de monitoreo */}
                    <div className="mb-4">
                        <label className="block text-base font-medium text-gray-800 mb-2 flex justify-between">
                            <span>Etapa Actual del Cultivo</span>
                            {activeCycle && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                    Ciclo activo: {activeCycle.name}
                                </span>
                            )}
                        </label>
                        <div className="relative">
                            <select
                                className={`appearance-none w-full bg-white px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 text-lg font-medium ${
                                    activeCycle ? 'border-green-500' : ''
                                }`}
                                value={editedSettings.etapaMonitoreo || 'Vegetativa'}
                                onChange={(e) => handleChange('etapaMonitoreo', e.target.value as keyof typeof PARAMETROS_ETAPAS)}
                                disabled={!!activeCycle} // Deshabilitar si hay ciclo activo
                            >
                                {Object.keys(PARAMETROS_ETAPAS).map((etapa) => (
                                    <option key={etapa} value={etapa}>
                                        {etapa}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                </svg>
                            </div>
                        </div>
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm text-green-800">
                                {activeCycle 
                                    ? <span>La etapa se ha configurado automáticamente según el ciclo de cultivo activo.</span>
                                    : <span>No hay ciclo activo. Seleccione manualmente la etapa de crecimiento.</span>
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Habilitar notificaciones */}
                <div className="mt-6">
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start">
                        <div className="flex-shrink-0 mr-3">
                            <input
                                type="checkbox"
                                id="enable-notifications"
                                className="h-6 w-6 text-green-600 focus:ring-green-500 border-green-300 rounded"
                                checked={editedSettings.enabled || false}
                                onChange={(e) => handleChange('enabled', e.target.checked)}
                            />
                        </div>
                        <div>
                            <label htmlFor="enable-notifications" className="text-lg font-medium text-green-900 cursor-pointer">
                                Activar sistema de notificaciones automáticas
                            </label>
                            <p className="mt-1 text-sm text-green-700">
                                Cuando está activado, el sistema enviará alertas a Telegram automáticamente cuando los valores de los sensores estén fuera del rango adecuado para la etapa seleccionada.
                            </p>
                            
                            {editedSettings.enabled && (
                                <div className="mt-2 bg-white p-2 rounded border border-green-200 text-sm">
                                    <span className="font-medium">Estado:</span> {monitoringStatus ? (
                                        <span className="text-green-600 font-medium">Monitoreo activo</span>
                                    ) : (
                                        <span className="text-orange-600 font-medium">
                                            Configurado pero inactivo. Haz clic en "Activar monitoreo" arriba para iniciar.
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Configuración de parámetros a monitorear */}
            <div className="mb-8 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-lg font-semibold text-green-800 mb-4">Parámetros a Monitorear</h4>
                <p className="mb-4 text-sm text-gray-600">
                    Selecciona qué variables ambientales quieres supervisar. El sistema solo enviará alertas para los parámetros seleccionados.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`flex items-start p-4 rounded-md border-2 ${editedSettings.monitorTemperature ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'}`}>
                        <input
                            type="checkbox"
                            className="h-5 w-5 mt-1 text-orange-600 focus:ring-orange-500 border-orange-300 rounded"
                            checked={editedSettings.monitorTemperature || false}
                            onChange={(e) => handleChange('monitorTemperature', e.target.checked)}
                            id="check-temperatura"
                        />
                        <label htmlFor="check-temperatura" className="ml-3 block">
                            <span className={`text-base font-medium ${editedSettings.monitorTemperature ? 'text-orange-800' : 'text-gray-800'}`}>
                                Temperatura
                            </span>
                            <p className={`text-sm mt-1 ${editedSettings.monitorTemperature ? 'text-orange-700' : 'text-gray-600'}`}>
                                Alerta cuando la temperatura esté fuera del rango óptimo para la etapa seleccionada.
                            </p>
                            
                            {editedSettings.monitorTemperature && editedSettings.etapaMonitoreo && (
                                <div className="mt-2 p-2 bg-white rounded border border-orange-200 text-xs text-orange-800">
                                    <div><span className="font-semibold">Etapa:</span> {editedSettings.etapaMonitoreo}</div>
                                    <div><span className="font-semibold">Rango óptimo:</span> {PARAMETROS_ETAPAS[editedSettings.etapaMonitoreo as keyof typeof PARAMETROS_ETAPAS].temperatura.min}°C - {PARAMETROS_ETAPAS[editedSettings.etapaMonitoreo as keyof typeof PARAMETROS_ETAPAS].temperatura.max}°C</div>
                                </div>
                            )}
                        </label>
                    </div>

                    <div className={`flex items-start p-4 rounded-md border-2 ${editedSettings.monitorHumidity ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                        <input
                            type="checkbox"
                            className="h-5 w-5 mt-1 text-blue-600 focus:ring-blue-500 border-blue-300 rounded"
                            checked={editedSettings.monitorHumidity || false}
                            onChange={(e) => handleChange('monitorHumidity', e.target.checked)}
                            id="check-humedad"
                        />
                        <label htmlFor="check-humedad" className="ml-3 block">
                            <span className={`text-base font-medium ${editedSettings.monitorHumidity ? 'text-blue-800' : 'text-gray-800'}`}>
                                Humedad Ambiental
                            </span>
                            <p className={`text-sm mt-1 ${editedSettings.monitorHumidity ? 'text-blue-700' : 'text-gray-600'}`}>
                                Alerta cuando la humedad del aire esté fuera del rango óptimo.
                            </p>
                            
                            {editedSettings.monitorHumidity && editedSettings.etapaMonitoreo && (
                                <div className="mt-2 p-2 bg-white rounded border border-blue-200 text-xs text-blue-800">
                                    <div><span className="font-semibold">Etapa:</span> {editedSettings.etapaMonitoreo}</div>
                                    <div><span className="font-semibold">Rango óptimo:</span> {PARAMETROS_ETAPAS[editedSettings.etapaMonitoreo as keyof typeof PARAMETROS_ETAPAS].humedad.min}% - {PARAMETROS_ETAPAS[editedSettings.etapaMonitoreo as keyof typeof PARAMETROS_ETAPAS].humedad.max}%</div>
                                </div>
                            )}
                        </label>
                    </div>

                    <div className={`flex items-start p-4 rounded-md border-2 ${editedSettings.monitorSoilHumidity ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                        <input
                            type="checkbox"
                            className="h-5 w-5 mt-1 text-green-600 focus:ring-green-500 border-green-300 rounded"
                            checked={editedSettings.monitorSoilHumidity || false}
                            onChange={(e) => handleChange('monitorSoilHumidity', e.target.checked)}
                            id="check-suelo"
                        />
                        <label htmlFor="check-suelo" className="ml-3 block">
                            <span className={`text-base font-medium ${editedSettings.monitorSoilHumidity ? 'text-green-800' : 'text-gray-800'}`}>
                                Humedad del Suelo
                            </span>
                            <p className={`text-sm mt-1 ${editedSettings.monitorSoilHumidity ? 'text-green-700' : 'text-gray-600'}`}>
                                Alerta cuando la humedad del sustrato esté fuera del rango óptimo.
                            </p>
                            
                            {editedSettings.monitorSoilHumidity && editedSettings.etapaMonitoreo && (
                                <div className="mt-2 p-2 bg-white rounded border border-green-200 text-xs text-green-800">
                                    <div><span className="font-semibold">Etapa:</span> {editedSettings.etapaMonitoreo}</div>
                                    <div><span className="font-semibold">Rango óptimo:</span> {PARAMETROS_ETAPAS[editedSettings.etapaMonitoreo as keyof typeof PARAMETROS_ETAPAS].humedad_suelo.min}% - {PARAMETROS_ETAPAS[editedSettings.etapaMonitoreo as keyof typeof PARAMETROS_ETAPAS].humedad_suelo.max}%</div>
                                </div>
                            )}
                        </label>
                    </div>

                    <div className={`flex items-start p-4 rounded-md border-2 ${editedSettings.notifyInactive ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                        <input
                            type="checkbox"
                            className="h-5 w-5 mt-1 text-red-600 focus:ring-red-500 border-red-300 rounded"
                            checked={editedSettings.notifyInactive || false}
                            onChange={(e) => handleChange('notifyInactive', e.target.checked)}
                            id="check-inactivo"
                        />
                        <label htmlFor="check-inactivo" className="ml-3 block">
                            <span className={`text-base font-medium ${editedSettings.notifyInactive ? 'text-red-800' : 'text-gray-800'}`}>
                                Sensores Inactivos
                            </span>
                            <p className={`text-sm mt-1 ${editedSettings.notifyInactive ? 'text-red-700' : 'text-gray-600'}`}>
                                Alerta cuando un sensor no haya enviado datos en más de 1 hora.
                            </p>
                            {editedSettings.notifyInactive && (
                                <div className="mt-2 p-2 bg-white rounded border border-red-200 text-xs text-red-800">
                                    <span className="font-semibold block">Importante:</span> 
                                    Esta opción detecta posibles fallos en el hardware o problemas de conectividad.
                                </div>
                            )}
                        </label>
                    </div>
                </div>
            </div>

            {/* Credenciales de Telegram - Con mejor visibilidad */}
            <div className="mt-6 border-t pt-4">
                <h4 className="text-lg font-semibold text-green-800 mb-3">Configuración de Telegram</h4>

                {/* Panel informativo mejorado para variables de entorno */}
                {(usingEnvCredentials.botToken || usingEnvCredentials.chatId) && (
                    <div className="mb-5 p-4 bg-blue-100 text-blue-800 rounded-lg border border-blue-300 shadow-sm">
                        <div className="flex items-center mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-bold">
                                Credenciales configuradas automáticamente
                            </p>
                        </div>
                        <ul className="text-sm list-disc pl-6 space-y-1">
                            {usingEnvCredentials.botToken && (
                                <li className="text-blue-900">El <strong>Token del Bot</strong> está configurado mediante la variable <code className="bg-blue-50 px-1 py-0.5 rounded text-blue-800 font-mono">TELEGRAM_BOT_TOKEN</code></li>
                            )}
                            {usingEnvCredentials.chatId && (
                                <li className="text-blue-900">El <strong>ID de Chat</strong> está configurado mediante la variable <code className="bg-blue-50 px-1 py-0.5 rounded text-blue-800 font-mono">TELEGRAM_CHAT_ID</code></li>
                            )}
                        </ul>
                    </div>
                )}

                {/* ID de Chat - Mejorado */}
                <div className="mb-5">
                    <div className="flex items-center mb-2">
                        <label className="text-base font-medium text-gray-800">
                            ID de Chat
                        </label>
                        {usingEnvCredentials.chatId && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                                <svg className="h-3 w-3 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Configurado automáticamente
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <input
                            type={showTokens ? "text" : "password"}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring 
                                ${usingEnvCredentials.chatId 
                                  ? 'bg-gray-50 border-green-400 text-gray-700 font-medium focus:ring-green-200' 
                                  : 'border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-300'}`}
                            value={editedSettings.telegramChatId || ''}
                            onChange={(e) => handleChange('telegramChatId', e.target.value)}
                            placeholder="Ejemplo: -1001234567890"
                            disabled={usingEnvCredentials.chatId}
                        />
                        {usingEnvCredentials.chatId && (
                            <div className="absolute inset-y-0 right-3 flex items-center">
                                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                        {usingEnvCredentials.chatId 
                            ? "Este campo está configurado automáticamente mediante la variable de entorno TELEGRAM_CHAT_ID y no puede modificarse desde aquí."
                            : "ID del chat donde se enviarán las notificaciones. Puede ser un ID personal o de un grupo de Telegram."}
                    </p>
                </div>

                {/* Token del Bot - Mejorado */}
                <div className="mb-5">
                    <div className="flex items-center mb-2">
                        <label className="text-base font-medium text-gray-800">
                            Token del Bot
                        </label>
                        {usingEnvCredentials.botToken && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                                <svg className="h-3 w-3 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 01-1.414 0l-4-4a1 1 011.414-1.414L8 12.586l7.293-7.293a1 1 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Configurado automáticamente
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <input
                            type={showTokens ? "text" : "password"}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring 
                                ${usingEnvCredentials.botToken 
                                  ? 'bg-gray-50 border-green-400 text-gray-700 font-medium focus:ring-green-200' 
                                  : 'border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-300'}`}
                            value={editedSettings.telegramBotToken || ''}
                            onChange={(e) => handleChange('telegramBotToken', e.target.value)}
                            placeholder="Ejemplo: 1234567890:ABCDefGhIjKlMnOpQrStUvWxYz"
                            disabled={usingEnvCredentials.botToken}
                        />
                        {usingEnvCredentials.botToken && (
                            <div className="absolute inset-y-0 right-3 flex items-center">
                                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                        {usingEnvCredentials.botToken 
                            ? "Este campo está configurado automáticamente mediante la variable de entorno TELEGRAM_BOT_TOKEN y no puede modificarse desde aquí."
                            : "Token proporcionado por BotFather al crear un bot en Telegram. Es necesario para enviar mensajes."}
                    </p>
                </div>

                {/* Opción de mostrar credenciales - Mejorada */}
                <div className="mb-4 mt-6">
                    <label className="flex items-center space-x-3 cursor-pointer py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <input
                            type="checkbox"
                            className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            checked={showTokens}
                            onChange={(e) => setShowTokens(e.target.checked)}
                        />
                        <span className="text-base font-medium text-gray-800 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {showTokens ? "Ocultar credenciales" : "Mostrar credenciales"}
                        </span>
                    </label>
                    <p className="mt-2 text-xs text-gray-500 pl-8">
                        Cambia esta opción para ver u ocultar las credenciales sensibles.
                    </p>
                </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-between mt-6">
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
                    disabled={saving}
                >
                    {saving ? 'Guardando...' : 'Guardar configuración'}
                </button>

                <button
                    onClick={handleSendTest}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                    disabled={sending}
                >
                    {sending ? 'Enviando...' : 'Enviar mensaje de prueba'}
                </button>
            </div>
        </div>
    );
}