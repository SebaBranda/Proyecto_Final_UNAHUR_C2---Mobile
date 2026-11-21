import { useEffect, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { agregarPunto, sincronizar } from '../services/historialUbicacion.js';
import {
  detenerSeguimiento, iniciarSeguimiento, OPCIONES_GPS, puntoUtil,
} from '../services/ubicacionSegundoPlano.js';

// Con la app abierta se intenta enviar la cola cada 5 minutos (y al volver a la app).
const ENVIAR_CADA_MS = 5 * 60 * 1000;
const OPCION_SIEMPRE = Platform.OS === 'ios' ? '"Permitir siempre"' : '"Permitir todo el tiempo"';
const AVISO_SOLO_ABIERTA = `Tu recorrido se registra solo con la app abierta. Para registrarlo también con el celular bloqueado, en los ajustes de ubicación de GalacticApp elegí ${OPCION_SIEMPRE}.`;

// Antes de pedir la ubicación "siempre" se explica para qué: en Android 11 o superior el sistema
// abre directamente la pantalla de ajustes.
const explicarPermiso = () => new Promise((resolver) => {
  Alert.alert(
    'Registrar tu recorrido',
    `Para registrar el recorrido de tu jornada aunque bloquees el celular, GalacticApp necesita tu ubicación ${OPCION_SIEMPRE}. Solo se usa mientras la jornada está activa.`,
    [
      { text: 'Ahora no', style: 'cancel', onPress: () => resolver(false) },
      { text: 'Continuar', onPress: () => resolver(true) },
    ],
    { cancelable: true, onDismiss: () => resolver(false) },
  );
});

// Intenta registrar en segundo plano: pide el permiso "siempre" (si hace falta) y arranca el
// servicio. Devuelve false si no hay tareas en segundo plano (Expo Go) o el técnico no dio el permiso.
async function activarSegundoPlano(jornadaId, ultimo) {
  try {
    if (!(await TaskManager.isAvailableAsync())) return false;
    let permiso = await Location.getBackgroundPermissionsAsync();
    if (!permiso.granted && permiso.canAskAgain && await explicarPermiso()) {
      permiso = await Location.requestBackgroundPermissionsAsync();
    }
    return permiso.granted ? iniciarSeguimiento(jornadaId, ultimo) : false;
  } catch {
    return false;
  }
}

// Con la jornada activa registra el recorrido del técnico con GPS: un punto cada vez que se mueve
// más de 75 metros (quieto no se guarda nada). Ver los criterios en services/ubicacionSegundoPlano.js.
// - Con permiso "siempre": lo hace un servicio en segundo plano, aunque el celular esté bloqueado.
// - Sin ese permiso (o en Expo Go): lo hace mientras la app está abierta.
// Además guarda un punto al iniciar la jornada. Al finalizarla, el servicio se detiene.
// Devuelve { error, enSegundoPlano } para mostrarlo en la pantalla de la jornada.
export function useUbicacionEnJornada(tecnicoId, jornada) {
  const [estado, establecerEstado] = useState({ error: '', enSegundoPlano: false });
  const jornadaId = jornada?.id ?? null;

  useEffect(() => {
    if (!tecnicoId) return;
    // Al ingresar se envía lo que quedó guardado (por ejemplo, de una jornada cerrada sin Wi-Fi).
    sincronizar().catch(() => false);
    // Con sesión y sin jornada activa (la finalizó, o la cerraron desde la web) no se registra nada.
    if (!jornadaId) detenerSeguimiento().catch(() => undefined);
  }, [tecnicoId, jornadaId]);

  useEffect(() => {
    if (!tecnicoId || !jornadaId) return undefined;
    let cancelado = false;
    let seguimiento = null;
    const avisar = (cambios) => { if (!cancelado) establecerEstado((actual) => ({ ...actual, ...cambios })); };

    // Guarda la posición actual como inicio de la jornada. Devuelve el punto guardado, null si no se
    // pudo leer el GPS, o false si no hay permiso de ubicación.
    const registrarInicio = async () => {
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (!permiso.granted) {
          avisar({ error: 'Habilitá el permiso de ubicación para registrar el recorrido.' });
          return false;
        }
        const posicion = await Location.getCurrentPositionAsync({ accuracy: OPCIONES_GPS.accuracy });
        const punto = {
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          registradoEn: new Date(posicion.timestamp || Date.now()).toISOString(),
          evento: 'inicio_jornada',
        };
        await agregarPunto(jornadaId, punto);
        return punto;
      } catch {
        avisar({ error: 'No se pudo guardar tu ubicación. Revisá el GPS.' });
        return null;
      }
    };

    // Sin segundo plano: sigue la posición mientras la app está abierta, con los mismos criterios.
    const seguirConAppAbierta = async (inicio) => {
      let ultimo = inicio;
      seguimiento = await Location.watchPositionAsync(OPCIONES_GPS, (posicion) => {
        const punto = puntoUtil(posicion, ultimo);
        if (!punto) return;
        ultimo = punto;
        agregarPunto(jornadaId, punto).catch(() => undefined);
      });
      // Si la jornada terminó mientras arrancaba, se corta enseguida.
      if (cancelado) seguimiento.remove();
    };

    (async () => {
      const inicio = await registrarInicio();
      if (cancelado || inicio === false) return;
      const ultimo = inicio ? { latitud: inicio.latitud, longitud: inicio.longitud } : null;
      const enSegundoPlano = await activarSegundoPlano(jornadaId, ultimo);
      if (cancelado) return;
      if (enSegundoPlano) {
        avisar({ error: '', enSegundoPlano: true });
      } else {
        avisar({ error: AVISO_SOLO_ABIERTA, enSegundoPlano: false });
        await seguirConAppAbierta(ultimo).catch(() => avisar({ error: 'No se pudo seguir tu ubicación. Revisá el GPS.' }));
      }
    })();

    // Con la app abierta: los puntos guardados (también los del segundo plano) se envían cada
    // 5 minutos y al volver a la app.
    const envio = setInterval(() => sincronizar().catch(() => false), ENVIAR_CADA_MS);
    const alCambiarEstado = AppState.addEventListener('change', (estadoApp) => {
      if (estadoApp === 'active') sincronizar().catch(() => false);
    });

    return () => {
      cancelado = true;
      seguimiento?.remove();
      clearInterval(envio);
      alCambiarEstado.remove();
    };
  }, [tecnicoId, jornadaId]);

  return tecnicoId && jornadaId ? estado : { error: '', enSegundoPlano: false };
}
