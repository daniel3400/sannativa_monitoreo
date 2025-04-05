import { NextResponse } from 'next/server';
import { supabase } from '@/app/utils/supabaseClient';

export async function GET() {
  try {
    // Consultar tablas usando rpc (función remota)
    const { data, error } = await supabase
      .rpc('get_sensor_tables');
    
    if (error) {
      console.log('Error consultando tablas de sensores:', error);
      // Fallback a consulta simple
      const { data: tableData, error: tableError } = await supabase
        .from('sensor_1')
        .select('id')
        .limit(1);

      // Si sensor_1 existe, asumimos algunos nombres de sensores comunes
      if (!tableError) {
        return NextResponse.json({ 
          success: false, 
          tables: ['sensor_1', 'sensor_2', 'sensor_3'], 
          message: 'No se pudo consultar lista de tablas, usando fallback'
        });
      }
      
      // Si no podemos verificar nada, devolvemos error
      return NextResponse.json({ 
        success: false, 
        tables: [], 
        message: 'Error consultando tablas de sensores'
      });
    }
    
    console.log('Datos recibidos de la función RPC:', data);
    
    // Verificar la estructura de los datos recibidos
    let sensorTables = [];
    
    if (Array.isArray(data)) {
      // Si es un array, necesitamos saber su estructura
      if (data.length > 0) {
        const sampleItem = data[0];
        
        // Si cada elemento es un string
        if (typeof sampleItem === 'string') {
          sensorTables = data.filter(tableName => 
            tableName.startsWith('sensor_')
          );
        }
        // Si cada elemento es un objeto con una propiedad table_name
        else if (sampleItem && typeof sampleItem === 'object' && sampleItem.table_name) {
          sensorTables = data
            .filter(item => item.table_name.startsWith('sensor_'))
            .map(item => item.table_name);
        }
        // Si cada elemento es un objeto con una propiedad diferente
        else if (sampleItem && typeof sampleItem === 'object') {
          // Intentar encontrar la propiedad que contiene el nombre de la tabla
          const possibleKeys = Object.keys(sampleItem);
          for (const key of possibleKeys) {
            const value = sampleItem[key];
            if (typeof value === 'string' && value.startsWith('sensor_')) {
              sensorTables = data.map(item => item[key]);
              break;
            }
          }
        }
      }
    } else if (data && typeof data === 'object') {
      // Si es un objeto con múltiples propiedades
      sensorTables = Object.keys(data)
        .filter(key => key.startsWith('sensor_'));
    }
    
    return NextResponse.json({
      success: true,
      tables: sensorTables.length > 0 ? sensorTables : ['sensor_1', 'sensor_2', 'sensor_3']
    });
  } catch (error) {
    console.error('Error en API de tablas:', error);
    
    return NextResponse.json({ 
      success: false, 
      tables: ['sensor_1', 'sensor_2', 'sensor_3'], 
      message: 'Error interno, usando tablas por defecto'
    });
  }
}