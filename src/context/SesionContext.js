import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { authApi } from '../services/api.js';
import { establecerToken, URL_API } from '../services/apiClient.js';

const SesionContext = createContext(null);

// Traduce el error del login a un mensaje para el técnico.
function mensajeDeError(error) {
  if (error.esRolInvalido) return error.message;
  if (!URL_API) return 'Falta configurar EXPO_PUBLIC_API_URL en .env.local (ver README).';
  if (error.response?.status === 401) return 'Usuario o contraseña incorrectos.';
  if (error.response?.status === 400) return 'Completá el usuario y la contraseña.';
  if (!error.response) return `No se pudo conectar con el servidor (${URL_API}). Revisá que el celular esté en la misma red que la PC.`;
  return 'No se pudo iniciar sesión. Intentá nuevamente.';
}

export function SesionProvider({ children }) {
  // null mientras no hay sesión. Con sesión: { usuario, jornadaActiva, vehiculo }.
  const [sesion, establecerSesion] = useState(null);

  const iniciarSesion = useCallback(async (usuario, contrasena) => {
    try {
      const respuesta = await authApi.iniciarSesion({
        usuario: usuario.trim().toLowerCase(),
        contrasena,
      });
      if (respuesta.usuario.rol !== 'Tecnico') {
        const error = new Error('La app móvil es solo para técnicos. Administradores y coordinadores ingresan desde la web.');
        error.esRolInvalido = true;
        throw error;
      }
      establecerToken(respuesta.token);
      establecerSesion({
        usuario: respuesta.usuario,
        jornadaActiva: respuesta.jornadaActiva ?? null,
        vehiculo: respuesta.vehiculo ?? null,
      });
    } catch (error) {
      throw new Error(mensajeDeError(error), { cause: error });
    }
  }, []);

  const cerrarSesion = useCallback(() => {
    establecerToken(null);
    establecerSesion(null);
  }, []);

  const valor = useMemo(() => ({ sesion, iniciarSesion, cerrarSesion }), [sesion, iniciarSesion, cerrarSesion]);
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return contexto;
}
