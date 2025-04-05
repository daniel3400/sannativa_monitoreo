"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/app/utils/supabaseClient';

const DatabaseManagement = () => {
  const [sqlQuery, setSqlQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      setError('La consulta SQL no puede estar vacía');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      // Verificar si la consulta comienza con SELECT para seguridad
      const isSelect = sqlQuery.trim().toUpperCase().startsWith('SELECT');
      
      if (!isSelect) {
        setError('Por razones de seguridad, solo se permiten consultas SELECT.');
        return;
      }

      const { data, error: queryError } = await supabase
        .rpc('execute_sql', { query: sqlQuery });

      if (queryError) throw queryError;
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ejemplos de consultas comunes
  const queryExamples = [
    { 
      name: 'Listar tablas', 
      description: 'Muestra todas las tablas de la base de datos',
      query: `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` 
    },
    { 
      name: 'Ver cultivos', 
      description: 'Muestra los primeros 10 ciclos de cultivo',
      query: 'SELECT * FROM ciclos_cultivo LIMIT 10' 
    },
    { 
      name: 'Datos sensores', 
      description: 'Muestra los últimos registros de sensores',
      query: 'SELECT * FROM sensor_1 ORDER BY created_at DESC LIMIT 10' 
    }
  ];

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-4 text-green-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          Consulta SQL
        </h3>
          
        <div className="space-y-5">
          {/* Control de contraste y etiqueta */}
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">
              Ingrese su consulta SQL (solo SELECT):
            </label>
            <button
              type="button"
              onClick={() => setHighContrast(!highContrast)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              </svg>
              {highContrast ? "Cambiar a modo normal" : "Cambiar a alto contraste"}
            </button>
          </div>
          
          {/* Textarea mejorado para visibilidad */}
          <div className={`border-2 ${highContrast ? 'border-blue-600' : 'border-gray-400'} rounded-md transition-all`}>
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className={`w-full h-48 p-4 rounded-md font-mono 
                      text-lg focus:outline-none focus:ring-0 border-0
                      ${highContrast 
                        ? 'bg-gray-900 text-white placeholder-gray-400' 
                        : 'bg-white text-black placeholder-gray-500'}
                      resize-y min-h-[100px]`}
              placeholder="SELECT * FROM nombre_tabla LIMIT 10"
              style={{
                lineHeight: '1.6',
                letterSpacing: '0.02em',
                fontWeight: '500'
              }}
            />
          </div>
          
          {/* Título para la sección de ejemplos */}
          <div>
            <h4 className="font-medium text-green-800 mb-2 text-sm">Consultas de ejemplo:</h4>
            
            {/* Ejemplos de consultas con mejor diseño */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {queryExamples.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setSqlQuery(example.query)}
                  className="flex flex-col text-left p-3 bg-blue-50 hover:bg-blue-100 
                          rounded-lg border border-blue-200 hover:border-blue-400 transition-colors
                          shadow-sm hover:shadow"
                  title={example.query}
                >
                  <span className="font-medium text-blue-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {example.name}
                  </span>
                  <span className="text-xs text-gray-600 mt-1">{example.description}</span>
                </button>
              ))}
            </div>
            
            {/* Botones de acción */}
            <div className="flex flex-wrap gap-2 justify-between">
              {/* Izquierda: Botón limpiar */}
              <div>
                {sqlQuery && (
                  <button
                    onClick={() => setSqlQuery('')}
                    className="flex items-center text-sm px-3 py-1.5 
                            bg-gray-100 hover:bg-red-50 
                            text-gray-700 hover:text-red-700
                            rounded border border-gray-300 hover:border-red-300
                            transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Limpiar consulta
                  </button>
                )}
              </div>
              
              {/* Derecha: Botón ejecutar */}
              <button
                onClick={executeQuery}
                disabled={loading}
                className={`flex items-center justify-center px-5 py-2.5 rounded-md font-medium text-white
                        bg-green-600 hover:bg-green-700 
                        disabled:bg-green-300 disabled:cursor-not-allowed
                        transition-colors shadow-md`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ejecutar consulta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sección de resultados */}
      {(result || error) && (
        <div className="mt-6 border-t pt-6">
          <h4 className="text-lg font-semibold mb-4 text-green-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Resultados
            {result && Array.isArray(result) && (
              <span className="ml-2 text-sm font-normal bg-green-100 text-green-800 py-0.5 px-2 rounded-full">
                {result.length} registros
              </span>
            )}
          </h4>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
              <p className="font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Error:
              </p>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <>
              {Array.isArray(result) && result.length > 0 ? (
                <>
                  <div className="overflow-x-auto border rounded">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(result[0]).map(key => (
                            <th 
                              key={key} 
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {result.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-blue-50'}>
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {val === null ? 'NULL' : 
                                  typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Botón para exportar resultados */}
                  <div className="mt-3 flex justify-end">
                    <button 
                      onClick={() => {
                        const csv = [
                          Object.keys(result[0]).join(','),
                          ...result.map(row => Object.values(row).map(v => 
                            v === null ? '' : 
                            typeof v === 'object' ? JSON.stringify(v).replace(/"/g, '""') : 
                            String(v).replace(/"/g, '""')
                          ).join(','))
                        ].join('\n');
                        
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'resultados_consulta.csv';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="flex items-center text-sm px-4 py-2 bg-blue-50 hover:bg-blue-100 
                            text-blue-700 rounded border border-blue-200 hover:border-blue-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Exportar a CSV
                    </button>
                  </div>
                </>
              ) : (
                <pre className="bg-gray-50 p-4 rounded overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabaseManagement;