import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ubicacionesApi } from './api.js';

const CLAVE = '@galacticapp/historial-ubicacion';
let sincronizando;

async function leer() {
  const contenido = await AsyncStorage.getItem(CLAVE);
  return contenido ? JSON.parse(contenido) : { jornadaId: null, puntos: [] };
}

async function guardar(historial) {
  await AsyncStorage.setItem(CLAVE, JSON.stringify(historial));
}

export async function agregarPunto(jornadaId, punto) {
  const historial = await leer();
  const actual = historial.jornadaId === jornadaId ? historial.puntos : [];
  await guardar({ jornadaId, puntos: [...actual, punto] });
  return sincronizar(jornadaId);
}

export async function sincronizar(jornadaId) {
  if (sincronizando) return sincronizando;
  sincronizando = sincronizarInterno(jornadaId);
  try {
    return await sincronizando;
  } finally {
    sincronizando = null;
  }
}

async function sincronizarInterno(jornadaId) {
  const red = await NetInfo.fetch();
  if (!red.isConnected || red.type !== NetInfo.NetInfoStateType.wifi) return false;
  const historial = await leer();
  if (historial.jornadaId !== jornadaId || !historial.puntos.length) return true;

  await ubicacionesApi.registrarRecorrido(jornadaId, historial.puntos);
  await guardar({ jornadaId, puntos: [] });
  return true;
}

export async function vaciarHistorial(jornadaId) {
  const sincronizado = await sincronizar(jornadaId);
  if (sincronizado) await guardar({ jornadaId: null, puntos: [] });
  return sincronizado;
}

NetInfo.addEventListener((red) => {
  if (red.isConnected && red.type === NetInfo.NetInfoStateType.wifi) {
    leer().then((historial) => {
      if (historial.jornadaId && historial.puntos.length) sincronizar(historial.jornadaId);
    }).catch(() => undefined);
  }
});
