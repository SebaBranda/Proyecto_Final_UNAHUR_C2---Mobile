import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api.js';
import { alCerrarseLaSesion, establecerToken, URL_API } from '../services/apiClient.js';
import { useUbicacionEnJornada } from './useUbicacionEnJornada.js';

const SesionContext = createContext(null);

// Traduce el error del login a un mensaje para el técnico.
function mensajeDeError(error) {
  if (error.esRolInvalido) return error.message;
  if (!URL_API) return 'Falta configurar EXPO_PUBLIC_API_URL en .env.local (ver README).';
  if (error.response?.status === 401) return 'Usuario o contraseña incorrectos.';
  if (error.response?.status === 400) return 'Completá el usuario y la contraseña.';
  if (error.response?.status === 403) return error.response.data?.mensaje || 'No tenés permiso para usar la app.';
  if (!error.response) return `No se pudo conectar con el servidor (${URL_API}). Revisá que el celular esté en la misma red que la PC.`;
  return 'No se pudo iniciar sesión. Intentá nuevamente.';
}

export function SesionProvider({ children }) {
  // null mientras no hay sesión. Con sesión: { usuario, jornadaActiva, vehiculo }.
  // jornadaActiva y vehiculo se actualizan con actualizarSesion (pantallas Jornada y Vehículo).
  const [sesion, establecerSesion] = useState(null);
  // Motivo por el que se cerró la sesión (se muestra en el login).
  const [aviso, establecerAviso] = useState('');

  // Si el backend cierra la sesión (venció o se ingresó desde otro lugar), vuelve al login.
  useEffect(() => {
    alCerrarseLaSesion((motivo) => {
      establecerSesion(null);
      establecerAviso(motivo);
    });
    return () => alCerrarseLaSesion(null);
  }, []);

  const iniciarSesion = useCallback(async (usuario, contrasena) => {
    try {
      const respuesta = await authApi.iniciarSesion({
        usuario: usuario.trim().toLowerCase(),
        contrasena,
        // El backend rechaza a quien no es técnico antes de abrir la sesión.
        plataforma: 'mobile',
      });
      if (respuesta.usuario.rol !== 'Tecnico') {
        const error = new Error('La app móvil es solo para técnicos. Administradores y coordinadores ingresan desde la web.');
        error.esRolInvalido = true;
        throw error;
      }
      establecerToken(respuesta.token);
      establecerAviso('');
      establecerSesion({
        usuario: respuesta.usuario,
        jornadaActiva: respuesta.jornadaActiva ?? null,
        vehiculo: respuesta.vehiculo ?? null,
      });
    } catch (error) {
      throw new Error(mensajeDeError(error), { cause: error });
    }
  }, []);

  // Salir: cierra la sesión también en el backend (aunque no responda, se sale igual).
  // Cambia datos de la sesión después de iniciar o finalizar la jornada, o de un control del vehículo.
  // cambios: { jornadaActiva } y/o { vehiculo }.
  const actualizarSesion = useCallback((cambios) => {
    establecerSesion((actual) => (actual ? { ...actual, ...cambios } : actual));
  }, []);

  // Con la jornada activa, la ubicación del técnico se manda al mapa del admin cada 5 minutos.
  const errorUbicacion = useUbicacionEnJornada(sesion?.usuario?.id, Boolean(sesion?.jornadaActiva));

  const cerrarSesion = useCallback(async () => {
    try {
      await authApi.cerrarSesion();
    } catch {
      // Sin conexión: la sesión vence sola en el backend.
    }
    establecerToken(null);
    establecerAviso('');
    establecerSesion(null);
  }, []);

  const valor = useMemo(
    () => ({ sesion, aviso, errorUbicacion, iniciarSesion, actualizarSesion, cerrarSesion }),
    [sesion, aviso, errorUbicacion, iniciarSesion, actualizarSesion, cerrarSesion],
  );
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return contexto;
}
