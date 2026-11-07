import * as Location from 'expo-location';
import { agregarPunto } from './historialUbicacion.js';

export async function registrarEventoUbicacion(jornadaId, evento) {
  try {
    const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return agregarPunto(jornadaId, {
      latitud: posicion.coords.latitude,
      longitud: posicion.coords.longitude,
      registradoEn: new Date(posicion.timestamp || Date.now()).toISOString(),
      evento,
    });
  } catch {
    return false;
  }
}
