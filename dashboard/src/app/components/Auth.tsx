"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { supabase } from "../utils/supabaseClient";

const Auth: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    
    try {
      // Validación básica
      if (!email || !password) {
        setError("Por favor ingrese su correo y contraseña");
        setLoading(false);
        return;
      }
      
      // Intentar autenticación con manejo de timeout
      const authPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('La conexión está tardando demasiado')), 10000)
      );
      
      // Usar Promise.race para manejar timeouts
      const { data, error } = await Promise.race([
        authPromise,
        timeoutPromise.then(() => { 
          throw new Error('Tiempo de espera agotado');
        })
      ]) as any;
      
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'administrador') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard/user');
      }
    } catch (error: any) {
      console.error("Error de autenticación:", error);
      
      // Mejorar mensajes de error
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        setError("Error de conexión. Verifique su conexión a internet o intente más tarde.");
      } else if (error.message === 'Tiempo de espera agotado') {
        setError("La conexión está tardando demasiado. Intente nuevamente.");
      } else if (error.message?.includes('Invalid login')) {
        setError("Credenciales incorrectas. Verifique su correo y contraseña.");
      } else {
        setError(error.message || "Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  // Manejar la tecla Enter para iniciar sesión
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSignIn();
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
      <div className="flex flex-col items-center">
        <Image
          src="/images/sannativa.jpg"
          alt="Logo"
          width={150}
          height={150}
          className="mb-6 rounded-xl shadow-md"
        />
        <h2 className="text-3xl font-bold text-green-800">Iniciar Sesión</h2>
        <p className="mt-2 text-sm text-green-600">Bienvenido al sistema</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-green-700">
            Correo Electrónico
          </label>
          <input
            type="email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            className="mt-1 block w-full px-3 py-2 bg-green-50 border border-green-300 rounded-md 
                     shadow-sm placeholder-green-400 focus:outline-none focus:ring-green-500 
                     focus:border-green-500 text-green-900"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-green-700">
            Contraseña
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="mt-1 block w-full px-3 py-2 bg-green-50 border border-green-300 rounded-md 
                     shadow-sm placeholder-green-400 focus:outline-none focus:ring-green-500 
                     focus:border-green-500 text-green-900"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 101.414 1.414L10 11.414l1.293 1.293a1 1 001.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={handleSignIn}
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md 
                     shadow-sm text-sm font-medium text-white 
                     ${loading 
                       ? 'bg-green-400 cursor-not-allowed' 
                       : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                     } 
                     transition-colors duration-200`}
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </div>
    </div>
  );
};

export default Auth;