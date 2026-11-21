import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { guardarPunto } from './historialUbicacion.js';
import { colores } from '../theme/colores.js';

// Recorrido en segundo plano: con la jornada activa, el celular registra la posición aunque esté
// bloqueado o se use otra app. Mientras tanto muestra una notificación fija.
// Los puntos solo se guardan en la cola del celular; se envían con la app abierta.
//
// Este archivo se importa al abrir la app (src/app/_layout.js): Expo exige que la tarea se defina
// fuera de los componentes, porque puede ejecutarse sin ninguna pantalla abierta.

const TAREA = 'galacticapp-recorrido-jornada';
// Jornada que se está siguiendo: { jornadaId, desde, version, ultimo: { latitud, longitud } }.
const CLAVE = '@galacticapp/seguimiento-jornada';
// Si cambian los parámetros del GPS, un servicio que ya estaba corriendo se reinicia con los nuevos.
const VERSION = 2;
// Tope de seguridad: si la jornada nunca se cierra desde el celular, el seguimiento se corta solo.
const DURACION_MAXIMA_MS = 16 * 60 * 60 * 1000;

// Criterios del recorrido (los usa también el seguimiento con la app abierta):
// - GPS (precisión alta), una posición cada 30 segundos como máximo: entre una y otra el GPS se apaga.
// - Solo se guarda un punto si se movió más de 75 metros: quieto no se guarda nada.
// - Se descartan las posiciones con más de 50 metros de error.
export const OPCIONES_GPS = {
  accuracy: Location.Accuracy.High,
  timeInterval: 30 * 1000,
  distanceInterval: 75,
};
const DISTANCIA_MINIMA_M = 75;
const ERROR_MAXIMO_M = 50;

// Distancia en metros entre dos puntos { latitud, longitud }.
function distanciaEnMetros(a, b) {
  const radianes = (grados) => (grados * Math.PI) / 180;
  const dLat = radianes(b.latitud - a.latitud);
  const dLon = radianes(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radianes(a.latitud)) * Math.cos(radianes(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// Convierte una posición del GPS en un punto del recorrido, o devuelve null si no sirve:
// demasiado imprecisa o a menos de 75 metros del último punto guardado.
export function puntoUtil(posicion, ultimo, evento = 'intervalo') {
  const { latitude: latitud, longitude: longitud, accuracy } = posicion.coords;
  if (accuracy != null && accuracy > ERROR_MAXIMO_M) return null;
  if (ultimo && distanciaEnMetros(ultimo, { latitud, longitud }) < DISTANCIA_MINIMA_M) return null;
  return { latitud, longitud, registradoEn: new Date(posicion.timestamp || Date.now()).toISOString(), evento };
}

const leerSeguimiento = async () => JSON.parse((await AsyncStorage.getItem(CLAVE)) || 'null');

async function servicioActivo() {
  try {
    return await Location.hasStartedLocationUpdatesAsync(TAREA);
  } catch {
    return false;
  }
}

// En Expo Go para Android las tareas no existen: ahí la app registra solo con la app abierta.
try {
  TaskManager.defineTask(TAREA, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const seguimiento = await leerSeguimiento();
    if (!seguimiento || Date.now() - seguimiento.desde > DURACION_MAXIMA_MS) {
      await detenerSeguimiento();
      return;
    }
    let { ultimo } = seguimiento;
    const posiciones = [...data.locations].sort((a, b) => a.timestamp - b.timestamp);
    for (const posicion of posiciones) {
      const punto = puntoUtil(posicion, ultimo);
      if (!punto) continue;
      await guardarPunto(seguimiento.jornadaId, punto);
      ultimo = { latitud: punto.latitud, longitud: punto.longitud };
    }
    await AsyncStorage.setItem(CLAVE, JSON.stringify({ ...seguimiento, ultimo }));
  });
} catch {
  // Sin tareas en segundo plano (Expo Go): no hay nada que definir.
}

// Arranca el servicio para la jornada. ultimo: el punto de inicio que ya registró la app (para no
// repetirlo). Si ya estaba corriendo para la misma jornada y con estos parámetros (por ejemplo,
// al volver a abrir la app), lo deja como está. Devuelve false si no se pudo arrancar.
export async function iniciarSeguimiento(jornadaId, ultimo = null) {
  const anterior = await leerSeguimiento();
  const mismaJornada = anterior?.jornadaId === jornadaId;
  const activo = await servicioActivo();
  if (mismaJornada && anterior.version === VERSION && activo) return true;
  if (activo) {
    try {
      await Location.stopLocationUpdatesAsync(TAREA);
    } catch {
      // Ya estaba detenido.
    }
  }
  await AsyncStorage.setItem(CLAVE, JSON.stringify(mismaJornada
    ? { ...anterior, version: VERSION }
    : { jornadaId, desde: Date.now(), version: VERSION, ultimo }));
  try {
    await Location.startLocationUpdatesAsync(TAREA, {
      ...OPCIONES_GPS,
      // Las posiciones llegan en tandas cada 2 minutos: la app se despierta menos y ahorra batería.
      deferredUpdatesInterval: 2 * 60 * 1000,
      activityType: Location.ActivityType.AutomotiveNavigation,
      // iPhone: se pausa solo cuando el celular está quieto.
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'GalacticApp está registrando tu recorrido',
        notificationBody: 'Tu jornada está activa. Se detiene al finalizarla.',
        notificationColor: colores.primario,
        // Sigue aunque se cierre la app: el recorrido es de la jornada, no de la pantalla.
        killServiceOnDestroy: false,
      },
    });
    return true;
  } catch {
    await AsyncStorage.removeItem(CLAVE);
    return false;
  }
}

// Detiene el servicio (al finalizar la jornada o salir de la sesión).
export async function detenerSeguimiento() {
  await AsyncStorage.removeItem(CLAVE);
  if (await servicioActivo()) {
    try {
      await Location.stopLocationUpdatesAsync(TAREA);
    } catch {
      // Ya estaba detenido.
    }
  }
}
