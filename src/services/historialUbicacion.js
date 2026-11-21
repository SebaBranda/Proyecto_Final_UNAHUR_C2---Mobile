import AsyncStorage from '@react-native-async-storage/async-storage';
// NetInfoStateType se importa aparte: no viene dentro de NetInfo (NetInfo.NetInfoStateType es undefined).
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import { ubicacionesApi } from './api.js';
import { haySesion } from './apiClient.js';

// Cola del recorrido guardada en el celular: { puntos: [{ jornadaId, latitud, longitud, registradoEn, evento }] }.
// Guarda puntos de varias jornadas: si una jornada se cierra sin Wi-Fi, sus puntos esperan y se
// envían después, aunque ya haya empezado otra.
const CLAVE = '@galacticapp/historial-ubicacion';
// Con datos móviles se envía como máximo cada 5 minutos (con Wi-Fi, enseguida): lo que más gasta
// no son los puntos sino cada pedido, así que conviene mandarlos en tandas.
const ENVIO_CON_DATOS_CADA_MS = 5 * 60 * 1000;
let ultimoEnvioConDatos = 0;
let sincronizando;
// 5 decimales: precisión de 1 metro, suficiente y más liviano para enviar.
const redondear = (coordenada) => Math.round(coordenada * 1e5) / 1e5;

async function leer() {
  const contenido = await AsyncStorage.getItem(CLAVE);
  if (!contenido) return { puntos: [] };
  const historial = JSON.parse(contenido);
  // Formato anterior: una sola jornada para todos los puntos.
  if (!historial.puntos.every((punto) => punto.jornadaId)) {
    return { puntos: historial.puntos.map((punto) => ({ ...punto, jornadaId: punto.jornadaId ?? historial.jornadaId })) };
  }
  return historial;
}

async function guardar(historial) {
  await AsyncStorage.setItem(CLAVE, JSON.stringify(historial));
}

// La app y la tarea de segundo plano escriben en la misma cola: los cambios se hacen de a uno
// para que una escritura no pise a la otra.
let escrituras = Promise.resolve();
function enOrden(cambio) {
  const resultado = escrituras.then(cambio);
  escrituras = resultado.catch(() => undefined);
  return resultado;
}

// Guarda un punto en la cola del celular, sin enviarlo. La usa la tarea de segundo plano, que
// puede correr sin sesión: el envío se hace después, con la app abierta y Wi-Fi.
export function guardarPunto(jornadaId, punto) {
  return enOrden(async () => {
    const historial = await leer();
    const liviano = { ...punto, latitud: redondear(punto.latitud), longitud: redondear(punto.longitud) };
    await guardar({ puntos: [...historial.puntos, { ...liviano, jornadaId }] });
  });
}

// Guarda un punto y, si corresponde, envía la cola.
export async function agregarPunto(jornadaId, punto) {
  await guardarPunto(jornadaId, punto);
  return sincronizar();
}

// Envía todos los puntos pendientes (de todas las jornadas). Devuelve true si la cola quedó vacía.
// forzar: envía aunque con datos móviles no hayan pasado 5 minutos (al finalizar la jornada).
export async function sincronizar({ forzar = false } = {}) {
  if (sincronizando) return sincronizando;
  sincronizando = sincronizarInterno(forzar);
  try {
    return await sincronizando;
  } finally {
    sincronizando = null;
  }
}

// Saca de la cola los puntos ya enviados de una jornada (los nuevos que llegaron mientras tanto quedan).
const quitarEnviados = (enviados) => enOrden(async () => {
  const historial = await leer();
  await guardar({ puntos: historial.puntos.filter((punto) => !enviados.has(`${punto.jornadaId}|${punto.registradoEn}`)) });
});

async function sincronizarInterno(forzar) {
  // Sin sesión (por ejemplo, la tarea de segundo plano con la app cerrada) se espera a que el
  // técnico vuelva a ingresar: los puntos siguen guardados en el celular.
  if (!haySesion()) return false;
  const red = await NetInfo.fetch();
  if (!red.isConnected) return false;
  const conDatos = red.type !== NetInfoStateType.wifi;
  if (conDatos && !forzar && Date.now() - ultimoEnvioConDatos < ENVIO_CON_DATOS_CADA_MS) return false;
  const { puntos } = await leer();
  if (!puntos.length) return true;
  if (conDatos) ultimoEnvioConDatos = Date.now();

  const porJornada = new Map();
  puntos.forEach((punto) => porJornada.set(punto.jornadaId, [...(porJornada.get(punto.jornadaId) || []), punto]));
  let todoEnviado = true;
  for (const [jornadaId, puntosDeJornada] of porJornada) {
    try {
      await ubicacionesApi.registrarRecorrido(jornadaId, puntosDeJornada.map(({ jornadaId: _jornada, ...punto }) => punto));
    } catch (error) {
      const estado = error?.response?.status;
      // El backend rechazó esos puntos (por ejemplo, la jornada es de otro técnico que usó este
      // celular): no se van a poder enviar nunca, así que se descartan. Si falló la conexión, se reintentan.
      if (!(estado >= 400 && estado < 500 && ![401, 408, 429].includes(estado))) {
        todoEnviado = false;
        continue;
      }
    }
    await quitarEnviados(new Set(puntosDeJornada.map((punto) => `${punto.jornadaId}|${punto.registradoEn}`)));
  }
  return todoEnviado;
}

// Al finalizar la jornada se intenta enviar todo enseguida. Sin conexión, los puntos quedan
// guardados y se envían más adelante (no se pierden aunque empiece otra jornada).
export async function vaciarHistorial() {
  return sincronizar({ forzar: true });
}

// Al recuperar la conexión se envía lo pendiente (con datos móviles, respetando los 5 minutos).
NetInfo.addEventListener((red) => {
  if (red.isConnected) sincronizar().catch(() => undefined);
});
