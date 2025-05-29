"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/app/utils/supabaseClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from '../charts/DynamicCharts';
import { PARAMETROS_ETAPAS } from '@/app/constants/parametrosEtapas';
import ParametroAlert from '@/app/components/shared/ParametroAlert';

console.log('PARAMETROS_ETAPAS disponibles:', Object.keys(PARAMETROS_ETAPAS));

interface SensorData {
  id: number;
  created_at: string;
  temperature: number;
  humidity: number;
  soil_humidity: number;
}

// Agregar nueva interfaz para separar los datos
interface SensorDataSets {
  graphData: SensorData[];
  tableData: SensorData[];
}

interface ChartDataPoint {
  name: string;
  valor: number;
}

const MonitoringDashboard = () => {
  const [sensorTables, setSensorTables] = useState<string[]>([]);
  // Modificar el estado para manejar los dos conjuntos de datos
  const [sensorData, setSensorData] = useState<Record<string, SensorDataSets>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const getSensorTables = async () => {
    try {
      // Consulta directa a las tablas públicas
      const { data, error } = await supabase
        .from('sensor_1')
        .select('id')
        .limit(1);

      // Si podemos acceder a sensor_1, buscamos más tablas
      if (!error) {
        const tables = [];
        let i = 1;

        while (true) {
          const tableName = `sensor_${i}`;
          const { data, error } = await supabase
            .from(tableName)
            .select('id')
            .limit(1);

          if (error) {
            break; // Si hay error, asumimos que no hay más tablas
          }

          tables.push(tableName);
          i++;
        }

        console.log('Tablas encontradas:', tables);
        return tables;
      }

      throw new Error('No se puede acceder a las tablas de sensores');
    } catch (error) {
      console.error('Error buscando tablas:', error);
      return []; // Retornamos array vacío en caso de error
    }
  };

  const loadSensorData = async () => {
    try {
      setLoading(true);
      console.log('Iniciando carga de datos...');

      // Obtener lista de tablas si no la tenemos
      let tablesToUse = sensorTables;
      if (sensorTables.length === 0) {
        const tables = await getSensorTables();
        if (tables.length === 0) {
          throw new Error('No se encontraron tablas de sensores');
        }
        tablesToUse = tables;
        setSensorTables(tables);
      }

      console.log('Tablas a consultar:', tablesToUse);

      // Cargar datos de cada sensor de forma secuencial
      const newSensorData: Record<string, SensorDataSets> = {};
      
      for (const tableName of tablesToUse) {
        try {
          console.log(`Consultando datos de ${tableName}...`);
          
          // Obtener datos para gráficos
          const { data: graphData, error: graphError } = await supabase
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(300);

          if (graphData && graphData.length > 0) {
            console.log(`Datos más recientes de ${tableName}:`, {
              created_at: graphData[0].created_at,
              horaLocal: adjustDateTime(graphData[0].created_at).toLocaleString()
            });
          }

          if (graphError) {
            console.error(`Error al cargar datos gráficos de ${tableName}:`, graphError);
            continue;
          }

          // Obtener datos para la tabla
          const { data: tableData, error: tableError } = await supabase
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

          if (tableError) {
            console.error(`Error al cargar datos de tabla de ${tableName}:`, tableError);
            continue;
          }

          newSensorData[tableName] = {
            graphData: graphData || [],
            tableData: tableData || []
          };

          console.log(`Datos cargados exitosamente para ${tableName}:`, {
            graficos: graphData?.length || 0,
            tabla: tableData?.length || 0
          });
        } catch (err) {
          console.error(`Error procesando ${tableName}:`, err);
        }
      }

      // Verificar que se obtuvieron datos
      const sensoresActualizados = Object.keys(newSensorData);
      console.log('Sensores actualizados:', sensoresActualizados);

      if (sensoresActualizados.length === 0) {
        console.warn('No se pudieron cargar datos de ningún sensor');
      } else {
        setSensorData(newSensorData);
        setLastUpdate(new Date());
        console.log('Actualización completada con éxito');
      }

    } catch (error) {
      console.error('Error general cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSensorTable = async () => {
    try {
      setLoading(true);

      // Obtener el siguiente número de sensor
      const nextSensorNumber = sensorTables.length + 1;
      const newTableName = `sensor_${nextSensorNumber}`;

      // Crear la nueva tabla
      const { error: createError } = await supabase
        .rpc('create_sensor_table', {
          table_name: newTableName
        });

      if (createError) {
        throw createError;
      }

      // Actualizar la lista de tablas
      const updatedTables = await getSensorTables();
      setSensorTables(updatedTables);

      alert(`Sensor ${nextSensorNumber} creado exitosamente`);

      // Recargar datos
      await loadSensorData();
    } catch (error) {
      console.error('Error creando sensor:', error);
      alert('Error al crear el sensor');
    } finally {
      setLoading(false);
    }
  };

  const deleteSensorTable = async (tableName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el ${tableName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setLoading(true);

      // Eliminar la tabla
      const { error: deleteError } = await supabase
        .rpc('delete_sensor_table', {
          table_name: tableName
        });

      if (deleteError) {
        console.error('Error detallado:', deleteError);
        throw new Error(`Error al eliminar la tabla: ${deleteError.message}`);
      }

      // Actualizar la lista de tablas
      const updatedTables = await getSensorTables();
      setSensorTables(updatedTables);

      // Actualizar sensorData eliminando la tabla borrada
      const newSensorData = { ...sensorData };
      delete newSensorData[tableName];
      setSensorData(newSensorData);

      alert(`Sensor ${tableName.replace('sensor_', '')} eliminado exitosamente`);
    } catch (error) {
      console.error('Error eliminando sensor:', error);
      alert(`Error al eliminar el sensor: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSensorData(); // Carga inicial
    
    // Actualización cada 5 minutos (300000 ms)
    const interval = setInterval(() => {
      console.log('Ejecutando actualización programada...');
      loadSensorData();
    }, 300000);
  
    // Limpieza al desmontar
    return () => {
      console.log('Limpiando intervalo de actualización');
      clearInterval(interval);
    };
  }, []);

  // Función auxiliar para ajustar la hora
  const adjustDateTime = (dateString: string): Date => {
    try {
      const date = new Date(dateString);
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.error('Fecha inválida:', dateString);
        return new Date(); // Retorna fecha actual si la fecha es inválida
      }
      
      // Ajustar a la zona horaria de Colombia (UTC-5)
      const colombiaTime = new Date(date.getTime() - (5 * 60 * 60 * 1000));
      console.log('Ajuste de hora:', {
        original: dateString,
        ajustada: colombiaTime.toISOString()
      });
      return colombiaTime;
    } catch (error) {
      console.error('Error ajustando fecha:', error);
      return new Date();
    }
  };

  // Modifica la función formatDateTime para un formato más corto
  const formatDateTime = (dateString: string): string => {
    const date = adjustDateTime(dateString);
    return date.toLocaleString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Modificar las funciones de formateo para usar el nuevo formato
  const formatTemperatureData = (data: SensorDataSets): ChartDataPoint[] => {
    return data.graphData.map(reading => ({
      name: formatDateTime(reading.created_at),
      valor: reading.temperature
    })).reverse(); // Revertimos el array para mostrar los datos en orden cronológico
  };

  const formatHumidityData = (data: SensorDataSets): ChartDataPoint[] => {
    return data.graphData.map(reading => ({
      name: formatDateTime(reading.created_at),
      valor: reading.humidity
    })).reverse();
  };

  const formatSoilHumidityData = (data: SensorDataSets): ChartDataPoint[] => {
    return data.graphData.map(reading => ({
      name: formatDateTime(reading.created_at),
      valor: reading.soil_humidity
    })).reverse();
  };

  if (loading) return <div className="text-green-900">Cargando datos de sensores...</div>;

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-green-900">Dashboard de Monitoreo</h2>
        <div className="flex gap-4">
          <button
            onClick={createSensorTable}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300"
          >
            Agregar Sensor
          </button>
          <button
            onClick={loadSensorData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'Actualizando...' : 'Actualizar Datos'}
          </button>
        </div>
      </div>

      <div className="text-sm text-green-600">
        Última actualización: {lastUpdate.toLocaleString()}
      </div>

      {Object.entries(sensorData).map(([tableName, data]) => (
        <div key={tableName} className="bg-green-50 shadow-lg rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
              <h3 className="text-xl font-semibold text-green-900">
                Sensor {tableName.replace('sensor_', '')}
              </h3>
              <button
                onClick={() => deleteSensorTable(tableName)}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Eliminar Sensor
              </button>
            </div>
            <div className="flex items-center space-x-2">
              {(() => {
                const lastReading = data.tableData[0];
                const lastReadingTime = lastReading ? adjustDateTime(lastReading.created_at).getTime() : 0;
                const timeDiff = Date.now() - lastReadingTime;
                const isActive = lastReading && timeDiff < 600000; // 10 minutos
                
                console.log(`Estado sensor ${tableName}:`, {
                  ultimaLectura: lastReading?.created_at,
                  tiempoPasado: timeDiff / 1000,
                  activo: isActive
                });
            
                return (
                  <>
                    <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-green-700">
                      {isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    {!isActive && lastReading && (
                      <span className="text-xs text-gray-500">
                        (Última actualización: {new Date(lastReadingTime).toLocaleString()})
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Añadir sección de alertas */}
          {data.tableData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <ParametroAlert
                valor={data.tableData[0].temperature}
                {...PARAMETROS_ETAPAS['Vegetativa'].temperatura}
                nombre="Temperatura"
                unidad="°C"
                tipoParametro="temperatura"
              />
              <ParametroAlert
                valor={data.tableData[0].humidity}
                {...PARAMETROS_ETAPAS['Vegetativa'].humedad}
                nombre="Humedad Ambiental"
                unidad="%"
                tipoParametro="humedad"
              />
              <ParametroAlert
                valor={data.tableData[0].soil_humidity}
                {...PARAMETROS_ETAPAS['Vegetativa'].humedad_suelo}
                nombre="Humedad del Suelo"
                unidad="%"
                tipoParametro="humedad_suelo"
              />
            </div>
          )}

          {/* Gráficos usando data.graphData */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {/* Temperatura */}
            <div className="mb-8 w-full flex flex-col items-center">
              <h4 className="text-lg font-medium mb-4 text-green-800">
                Temperatura (últimas {data.graphData.length} lecturas)
              </h4>
              <div className="h-[300px] flex justify-center w-full">
                <BarChart width={350} height={300} data={formatTemperatureData(data)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd" 
                    tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="valor" name="Temperatura (°C)" fill="#059669" maxBarSize={50} />
                </BarChart>
              </div>
            </div>

            {/* Humedad */}
            <div className="mb-8 w-full flex flex-col items-center">
              <h4 className="text-lg font-medium mb-4 text-green-800">
                Humedad
              </h4>
              <div className="h-[300px] flex justify-center w-full">
                <BarChart width={350} height={300} data={formatHumidityData(data)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="valor" name="Humedad (%)" fill="#0891b2" maxBarSize={50} />
                </BarChart>
              </div>
            </div>

            {/* Humedad del Suelo */}
            <div className="mb-8 w-full flex flex-col items-center">
              <h4 className="text-lg font-medium mb-4 text-green-800">
                Humedad del Suelo
              </h4>
              <div className="h-[300px] flex justify-center w-full">
                <BarChart width={350} height={300} data={formatSoilHumidityData(data)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="valor" name="Humedad del Suelo (%)" fill="#854d0e" maxBarSize={50} />
                </BarChart>
              </div>
            </div>
          </div>

          {/* Tabla usando data.tableData */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-green-200">
              <thead className="bg-green-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-900 uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-900 uppercase tracking-wider">
                    Temperatura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-900 uppercase tracking-wider">
                    Humedad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-900 uppercase tracking-wider">
                    Humedad del Suelo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-green-50 divide-y divide-green-200">
                {data.tableData.map((reading: SensorData) => (
                  <tr key={reading.id} className="hover:bg-green-100">
                    <td className="px-6 py-4 whitespace-nowrap text-green-900">
                      {adjustDateTime(reading.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-900">
                      {reading.temperature}°C
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-900">
                      {reading.humidity}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-900">
                      {reading.soil_humidity}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MonitoringDashboard;