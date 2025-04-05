"use client";

import { useState } from 'react';
import { supabase } from '@/app/utils/supabaseClient';

const DatabaseManagement = () => {
  const [sqlQuery, setSqlQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async () => {
    try {
      setError(null);
      const { data, error: queryError } = await supabase
        .rpc('execute_sql', { query: sqlQuery });

      if (queryError) throw queryError;
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4 text-xl font-bold mb-4 text-green-900">Ejecutar Consulta SQL</h3>
        <textarea
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          className="w-full h-32 p-2 border rounded"
          placeholder="Ingrese su consulta SQL aquí..."
        />
        <button
          onClick={executeQuery}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Ejecutar
        </button>
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Resultado:</h4>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseManagement;