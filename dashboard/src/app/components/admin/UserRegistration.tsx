import { useState } from 'react';
import { supabase } from '@/app/utils/supabaseClient';
import { sendTelegramNotification } from '@/lib/telegramService';

const UserRegistration = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('usuario');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Función mejorada para enviar notificaciones con mejor diagnóstico
  const safeNotify = async (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    try {
      console.log('Intentando enviar notificación:', { message, type });
      
      // Verificar las variables de entorno existentes
      console.log('Variables de entorno disponibles:', { 
        botToken: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN ? 'Configurado' : 'No configurado',
        chatId: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID ? 'Configurado' : 'No configurado',
        nodeEnv: process.env.NODE_ENV
      });
      
      // Solo intentamos enviar si estamos en producción o tenemos las credenciales configuradas
      if (process.env.NODE_ENV !== 'development' || 
          (process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN && process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID)) {
        const result = await sendTelegramNotification(message, { type });
        console.log('Resultado de envío:', result);
      } else {
        console.log(`[Notificación Telegram simulada - ${type}]:`, message);
      }
    } catch (notifyError) {
      console.error('Error detallado al enviar notificación:', notifyError);
    }
  };

  const handleSignUp = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Registrar usuario en Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Crear perfil de usuario
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              email: email,
              role: role,
              phone: phone
              // Eliminamos created_at ya que la columna no existe
            }
          ]);

        if (profileError) throw profileError;

        setSuccess(true);
        
        // Enviar notificación a Telegram
        await safeNotify(
          `Nuevo usuario registrado en el sistema:\n\nCorreo: ${email}\nTeléfono: ${phone || 'No proporcionado'}\nRol: ${role}\nFecha: ${new Date().toLocaleString()}`,
          'success'
        );
        
        // Limpiar formulario
        setEmail('');
        setPassword('');
        setPhone('');
        setRole('usuario');
      }
    } catch (error: any) {
      setError(error.message);
      
      // Notificar sobre errores de registro
      await safeNotify(
        `Error al registrar usuario:\n\nCorreo: ${email}\nError: ${error.message}`,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-300">
      <h2 className="text-xl font-semibold text-green-800 mb-6">
        Registrar Nuevo Usuario
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Correo Electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-md shadow-sm 
                     focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                     text-black font-medium text-base"
            style={{ opacity: 1, color: '#000000' }}
            placeholder="usuario@ejemplo.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Teléfono
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-md shadow-sm 
                     focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                     text-black font-medium text-base"
            style={{ opacity: 1, color: '#000000' }}
            placeholder="Ej: 123-456-7890"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-md shadow-sm 
                     focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                     text-black font-medium text-base"
            style={{ opacity: 1, color: '#000000' }}
            placeholder="••••••••"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Rol
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-md shadow-sm 
                     focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                     text-black font-medium text-base bg-white"
            style={{ opacity: 1, color: '#000000' }}
            required
          >
            <option value="usuario">Usuario</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-lg">
                ⚠️
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 p-4 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-lg">
                ✅
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-green-800">
                  Usuario registrado exitosamente
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSignUp}
          disabled={loading}
          className={`w-full px-4 py-3 text-white font-bold rounded-md transition-colors shadow-sm
                    ${loading 
                      ? 'bg-gray-500 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'}`}
        >
          {loading ? 'Registrando...' : 'Registrar Usuario'}
        </button>
      </div>
    </div>
  );
};

export default UserRegistration;