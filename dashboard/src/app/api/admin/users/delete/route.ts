import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear un cliente con privilegios administrativos usando la clave de servicio
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
  {
    auth: {
      persistSession: false,
    }
  }
);

export async function POST(request: Request) {
  try {
    // Obtener datos de la solicitud
    const { userId, userEmail } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el ID de usuario' },
        { status: 400 }
      );
    }
    
    console.log(`API: Iniciando eliminación de usuario: ${userEmail || userId}`);
    
    // 1. Eliminar el perfil primero
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.error('API: Error al eliminar perfil:', profileError);
      return NextResponse.json(
        { success: false, error: `Error al eliminar perfil: ${profileError.message}` },
        { status: 500 }
      );
    }
    
    // 2. Verificar que se eliminó correctamente
    const { data: checkUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId);
    
    if (checkUser && checkUser.length > 0) {
      console.error('API: El usuario sigue existiendo después de la eliminación');
      return NextResponse.json(
        { success: false, error: 'No se pudo eliminar el usuario, continúa en la base de datos' },
        { status: 500 }
      );
    }
    
    // 3. Intentar eliminar el usuario de autenticación
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.warn('API: No se pudo eliminar la cuenta de autenticación:', authError);
        return NextResponse.json({
          success: true,
          message: `Perfil eliminado pero no se pudo eliminar la cuenta de autenticación: ${authError.message}`
        });
      }
    } catch (authError: any) {
      console.warn('API: Error al eliminar cuenta de autenticación:', authError);
      return NextResponse.json({
        success: true,
        message: 'Perfil eliminado pero la cuenta de autenticación podría persistir'
      });
    }
    
    console.log('API: Usuario eliminado completamente:', userEmail || userId);
    return NextResponse.json({
      success: true,
      message: `Usuario ${userEmail || userId} eliminado completamente`
    });
  } catch (error: any) {
    console.error('API: Error al procesar la eliminación:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error desconocido' },
      { status: 500 }
    );
  }
}