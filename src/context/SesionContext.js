import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { authApi, jornadasApi } from '../services/api.js';
import {
  alCerrarseLaSesion, alQuedarSinJornada, establecerToken, URL_API,
} from '../services/apiClient.js';
import { useUbicacionEnJornada } from './useUbicacionEnJornada.js';
import { detenerSeguimiento } from '../services/ubicacionSegundoPlano.js';

const SesionContext = createContext(null);

const SIN_INTERNET = 'No tenés conexión a internet. Conectate a una red Wi-Fi o activá los datos móviles e intentá de nuevo.';

// Traduce el error del login a un mensaje para el técnico (sin detalles técnicos).
function mensajeDeError(error) {
  if (error.esRolInvalido || error.esSinInternet) return error.message;
  if (!URL_API) return 'Falta configurar EXPO_PUBLIC_API_URL en .env.local (ver README).';
  const estado = error.response?.status;
  if (estado === 401) return 'Usuario o contraseña incorrectos.';
  if (estado === 400) return 'Completá el usuario y la contraseña.';
  if (estado === 403) return error.response.data?.mensaje || 'No tenés permiso para usar la app.';
  if (estado === 429) return error.response.data?.mensaje || 'Demasiados intentos fallidos. Probá de nuevo en unos minutos.';
  if (estado >= 500) return 'El servidor tuvo un problema. Intentá de nuevo en unos minutos.';
  if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
    return 'El servidor tardó demasiado en responder. Revisá tu conexión e intentá de nuevo.';
  }
  if (!error.response) {
    // En desarrollo (Expo Go) se muestra la dirección para ayudar a encontrar el problema.
    return __DEV__
      ? `No se pudo conectar con el servidor (${URL_API}). Revisá que el celular esté en la misma red que la PC.`
      : 'No se pudo conectar con el servidor. Revisá tu conexión a internet e intentá de nuevo.';
  }
  return 'No se pudo iniciar sesión. Intentá nuevamente.';
}

// Sin conexión se avisa enseguida, sin esperar a que el pedido al servidor se agote (10 segundos).
// isInternetReachable puede ser null mientras el celular lo averigua: solo cuenta un "no" seguro.
async function comprobarConexion() {
  try {
    const red = await NetInfo.fetch();
    if (red.isConnected === false || red.isInternetReachable === false) {
      const error = new Error(SIN_INTERNET);
      error.esSinInternet = true;
      throw error;
    }
  } catch (error) {
    if (error.esSinInternet) throw error;
    // Si no se pudo averiguar, se intenta igual: el pedido dirá si hay conexión.
  }
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
    alQuedarSinJornada(() => {
      establecerSesion((actual) => (actual ? { ...actual, jornadaActiva: null } : actual));
    });
    return () => {
      alCerrarseLaSesion(null);
      alQuedarSinJornada(null);
    };
  }, []);

  const iniciarSesion = useCallback(async (usuario, contrasena) => {
    try {
      await comprobarConexion();
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
      establecerToken(respuesta.token, respuesta.expiresIn);
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

  // Inicia la jornada (la hora la pone el backend). Con vehículo, recibe el control inicial
  // ({ kilometraje, nivelCombustible, estado, imagenes }), que también queda registrado en el vehículo.
  // Al quedar activa, se desbloquean los reclamos en todas las pantallas.
  const iniciarJornada = useCallback(async (controlInicial) => {
    const { usuario, vehiculo } = sesion;
    const jornada = await jornadasApi.iniciar(usuario.id, controlInicial);
    actualizarSesion({
      jornadaActiva: jornada,
      ...(vehiculo && controlInicial ? {
        vehiculo: { ...vehiculo, kilometraje: { ...vehiculo.kilometraje, actual: controlInicial.kilometraje } },
      } : {}),
    });
    return jornada;
  }, [sesion, actualizarSesion]);

  // Con la jornada activa se registra el recorrido del técnico cada 5 minutos (en segundo plano si
  // dio el permiso de ubicación "siempre"). errorUbicacion: aviso para la pantalla de la jornada.
  const { error: errorUbicacion, enSegundoPlano: ubicacionEnSegundoPlano } = useUbicacionEnJornada(
    sesion?.usuario?.id,
    sesion?.jornadaActiva,
  );

  const cerrarSesion = useCallback(async () => {
    try {
      await authApi.cerrarSesion();
    } catch {
      // Sin conexión: la sesión vence sola en el backend.
    }
    // Al salir de la sesión deja de registrarse el recorrido.
    await detenerSeguimiento().catch(() => undefined);
    establecerToken(null);
    establecerAviso('');
    establecerSesion(null);
  }, []);

  const valor = useMemo(
    () => ({
      sesion, aviso, errorUbicacion, ubicacionEnSegundoPlano, iniciarSesion, actualizarSesion, iniciarJornada, cerrarSesion,
    }),
    [sesion, aviso, errorUbicacion, ubicacionEnSegundoPlano, iniciarSesion, actualizarSesion, iniciarJornada, cerrarSesion],
  );
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return contexto;
}
