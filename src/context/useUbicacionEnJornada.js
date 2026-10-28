import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { ubicacionesApi } from '../services/api.js';

const CADA_MS = 5 * 60 * 1000;

// Mientras la jornada está activa y la app abierta, manda la ubicación del técnico cada 5 minutos
// (igual que la web), para que aparezca en el mapa del admin y del coordinador.
// Devuelve un mensaje de error para mostrar, o '' si todo va bien.
export function useUbicacionEnJornada(tecnicoId, jornadaActiva) {
  const [error, establecerError] = useState('');

  useEffect(() => {
    if (!tecnicoId || !jornadaActiva) return undefined;
    let cancelado = false;

    const registrar = async () => {
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (!permiso.granted) {
          if (!cancelado) establecerError('Habilitá el permiso de ubicación para aparecer en el mapa.');
          return;
        }
        const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await ubicacionesApi.actualizar(tecnicoId, posicion.coords.latitude, posicion.coords.longitude);
        if (!cancelado) establecerError('');
      } catch {
        if (!cancelado) establecerError('No se pudo enviar tu ubicación. Revisá el GPS y la conexión.');
      }
    };

    registrar();
    const intervalo = setInterval(registrar, CADA_MS);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [tecnicoId, jornadaActiva]);

  // Sin jornada activa no hay nada que avisar.
  return tecnicoId && jornadaActiva ? error : '';
}
