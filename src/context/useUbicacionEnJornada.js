import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { agregarPunto, sincronizar } from '../services/historialUbicacion.js';

const CADA_MS = 5 * 60 * 1000;

export function useUbicacionEnJornada(tecnicoId, jornada) {
  const [error, establecerError] = useState('');

  useEffect(() => {
    if (!tecnicoId || !jornada?.id) return undefined;
    let cancelado = false;

    const registrar = async (evento = 'intervalo') => {
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (!permiso.granted) {
          if (!cancelado) establecerError('Habilitá el permiso de ubicación para registrar el recorrido.');
          return;
        }
        const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const punto = {
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          registradoEn: new Date(posicion.timestamp || Date.now()).toISOString(),
          evento,
        };
        await agregarPunto(jornada.id, punto);
        if (!cancelado) establecerError('');
      } catch {
        if (!cancelado) establecerError('No se pudo guardar tu ubicación. Revisá el GPS.');
      }
    };

    registrar('inicio_jornada');
    const intervalo = setInterval(registrar, CADA_MS);
    const red = sincronizar(jornada.id).catch(() => false);
    void red;
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [tecnicoId, jornada?.id]);

  return tecnicoId && jornada?.id ? error : '';
}
